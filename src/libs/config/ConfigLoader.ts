import {isObject, isString, snakeCase} from 'lodash';
import {Config, IConfigOptions, IOptions} from '@allgemein/config';
import {
  DefaultNamespacedRegistry,
  IClassRef,
  IEntityRef,
  JsonSchema,
  METATYPE_CLASS_REF,
  RegistryFactory
} from '@allgemein/schema-api';
import {NAMESPACE_CONFIG} from './Constants';
import {ConfigLoadOrder} from './ConfigLoadOrder';
import {ITypexsOptions} from '../ITypexsOptions';
import {Log} from '../logging/Log';
import {PlatformUtils} from '@allgemein/base';
import {CONFIG_NAMESPACE} from '../Constants';
import {BaseUtils} from '../utils/BaseUtils';
import {IActivator} from '../../api/IActivator';
import {isClassRef} from '@allgemein/schema-api/api/IClassRef';
import {Injector} from '../di/Injector';
import {CACHE_NAME, ICache} from '../cache/ICache';

let ajv: any = null;
const BIN_CONFIG_SCHEMA = 'config.schema';

export class ConfigLoader {

  static NAME = ConfigLoader.name;

  private configuration: ITypexsOptions;

  private configOptions: IOptions = {};

  private REQUIREMENTS = false;

  private CONFIG_LOADED = false;

  constructor(configuration: any = {}) {
    this.configuration = configuration || {};
    this.initConfigSources();
  }


  /**
   * Initialise config sources types and load order.
   */
  initConfigSources() {
    const cs = this.getConfigSources();
    this.setConfigSources(cs);
  }

  /**
   * Check if config file load order is present. Possible passthourgh of the config order is:
   * - env variable
   * - load config order json file fi exists
   *   - like config-load.json oder ./config/config-load.json
   * - use at least DEFAULT_CONFIG_LOAD_ORDER
   */
  getConfigSources() {
    const configLoadOrder = new ConfigLoadOrder();
    configLoadOrder.detect();
    return configLoadOrder.get();
  }


  setConfigSources(sources: IConfigOptions[]) {
    this.configOptions.configs = sources;
    return this;
  }


  getConfiguration() {
    return this.configuration;
  }


  addConfigOptions(options: IOptions) {
    const opts = this.configOptions;
    this.configOptions = BaseUtils.merge(opts, options);
    return this.configOptions;
  }


  // async initSchema() {
  //   await JsonSchema.unserialize(CONFIG_SCHEMA, {namespace: NAMESPACE_CONFIG, className: 'Config'});
  // }

  /**
   * load config schema from
   *
   * @param loader
   */
  async loadSchemaByActivators(activators: IActivator[]) {
    for (const activator of activators) {
      if (activator.configSchema) {
        const schema = activator.configSchema();
        if (schema) {
          this.applySchema(schema);
        }
      }
    }
  }

  async applySchema(jsonSchema: any) {
    return await JsonSchema.unserialize(jsonSchema, {
      namespace: NAMESPACE_CONFIG,
      className: 'Config',
      rootAsEntity: false
    });
  }

  getRegistry(): DefaultNamespacedRegistry {
    return RegistryFactory.get(NAMESPACE_CONFIG);
  }

  async loadRequirements() {
    if (!this.REQUIREMENTS) {
      this.REQUIREMENTS = true;
      try {
        ajv = await import('ajv');
      } catch (e) {

      }
    }
  }

  async validateFunction(part: string = null) {
    await this.loadRequirements();
    if (!ajv) {
      throw new Error('Validator \'ajv\'  not found');
    }
    const lookupFor = part ? snakeCase(part) : 'config';

    const cacheKey = 'schema-' + lookupFor;
    const cache = this.getCache();
    let schema: any = null;
    if (cache) {
      schema = await cache.get(cacheKey, BIN_CONFIG_SCHEMA);
    }

    if (!schema) {
      let ref: IClassRef | IEntityRef = this.getRegistry().find(METATYPE_CLASS_REF, (x: any) => snakeCase(x.name) === lookupFor);
      if (!ref) {
        throw new Error('Can\'t find any config entry for ' + lookupFor);
      }
      if (isClassRef(ref) && ref.hasEntityRef()) {
        ref = ref.getEntityRef();
      }
      schema = JsonSchema.serialize(ref);
      if (cache) {
        await cache.set(cacheKey, schema, BIN_CONFIG_SCHEMA);
      }
    }
    if (!schema) {
      throw new Error('Can\'t create/load schema for ' + lookupFor);
    }
    const _ajv = new ajv();
    return _ajv.compile(schema);
  }


  async validate(data: any, path: string = null): Promise<{ valid: boolean, errors: any[] }> {
    const fn = await this.validateFunction(path);
    const result = fn(data);
    return {valid: result, errors: fn.errors};
  }


  getCache(): ICache {
    try {
      return Injector.get(CACHE_NAME);
    } catch (e) {
      return null;
    }
  }


  configure(c: any = null) {
    if (this.CONFIG_LOADED) {
      Log.warn('already configured');
      return this;
    }
    this.CONFIG_LOADED = true;

    if (this.configuration.app.path) {
      this.configOptions.workdir = this.configuration.app.path;
    }

    // check if it is an file
    try {
      let additionalData = null;

      if (isString(c)) {
        // can be file or JSON with config
        try {
          additionalData = JSON.parse(c);
        } catch (e) {

          let configfile: string = null;

          if (PlatformUtils.isAbsolute(c)) {
            configfile = PlatformUtils.pathNormalize(c);
          } else {
            configfile = PlatformUtils.pathResolveAndNormalize(c);
          }

          if (PlatformUtils.fileExist(configfile)) {
            this.configOptions.configs.push({type: 'file', file: configfile});
          } else {
            // INFO that file couldn't be loaded, because it doesn't exist
          }
        }
      } else if (isObject(c)) {
        additionalData = c;
      }

      this.configOptions = Config.options(this.configOptions);

      if (isObject(additionalData)) {
        Config.jar(CONFIG_NAMESPACE).merge(additionalData);
      }

      this.configOptions.configs.forEach(_c => {
        if (_c.state && _c.type !== 'system') {
          Log.debug('Loaded configuration from ' + (isString(_c.file) ? _c.file : _c.file.dirname + '/' + _c.file.filename));
        }
      });

    } catch (err) {
      Log.error(err);
      process.exit(1);
    }
    const add = Config.jar(CONFIG_NAMESPACE).get('');
    this.configuration = BaseUtils.merge(this.configuration, add);
    Config.jar(CONFIG_NAMESPACE).merge(this.configuration);

    return this;
  }

}
