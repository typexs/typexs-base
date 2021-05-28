import {Config, FileSource} from '@allgemein/config';
import {ICommand} from '../libs/commands/ICommand';
import {System} from '../libs/system/System';
import {Log} from '../libs/logging/Log';
import {Argv} from 'yargs';
import {ConfigLoader} from '../libs/config/ConfigLoader';
import {Inject} from 'typedi';
import {Console} from '../libs/logging/Console';
import {
  LOAD_ORDER_ONLY,
  OPTIONS_ONLY,
  SCHEMA_ONLY,
  USED_FILES_ONLY,
  USED_SOURCES_ONLY,
  VALIDATE_ONLY
} from '../libs/config/Constants';

/**
 * With the config command the current loaded configuration can be returned.
 * By passing a "key" value which represents the path in the config object, the value of the path will be followed.
 */
export class ConfigOutputCommand implements ICommand {


  @Inject(ConfigLoader.NAME)
  configLoader: ConfigLoader;

  command = 'config [key]';

  aliases = 'c';

  describe = 'Show config or config element';


  builder(yargs: Argv) {
    yargs.option(LOAD_ORDER_ONLY, {description: 'Outputs the current loader order.', type: 'boolean'});
    yargs.option(USED_FILES_ONLY, {description: 'Outputs only the file of the configuration.', type: 'boolean'});
    yargs.option(USED_SOURCES_ONLY, {description: 'Outputs only the source of the configuration.', type: 'boolean'});
    yargs.option(OPTIONS_ONLY, {description: 'Outputs only the config options.', type: 'boolean'});
    yargs.option(VALIDATE_ONLY, {description: 'Validate only the current configuration.', type: 'boolean'});
    yargs.option(SCHEMA_ONLY, {description: 'Outputs the current config structure as json schema.', type: 'boolean'});
    return yargs;
  }


  beforeStartup(): void {
    System.enableDistribution(false);
  }

  beforeStorage(): void {
    Log.options({enable: false, loggers: [{name: '*', enable: false}]}, false);
  }


  async handler(argv: any) {
    let out = null;
    if (argv[USED_FILES_ONLY]) {
      const sources = [].concat(...Config.jars.map(j => j.sources()));
      const files = [];
      for (const s of sources) {
        if (s instanceof FileSource) {
          files.push(s.file);
        }
      }
      out = files;
    } else if (argv[USED_SOURCES_ONLY]) {
      out = [].concat(...Config.jars.map(j => j.sources()));
    } else if (argv[OPTIONS_ONLY]) {
      out = this.configLoader.getConfigOptions();
    } else if (argv[LOAD_ORDER_ONLY]) {
      out = this.configLoader.getConfigOptions().configs;
    } else if (argv[VALIDATE_ONLY]) {
      out = await this.configLoader.validateConfig();
    } else if (argv[SCHEMA_ONLY]) {
      out = await this.configLoader.getConfigSchema(argv.key ? argv.key : null);
    } else {
      if (argv.key) {
        out = Config.get(argv.key);
      } else {
        out = Config.all();
      }
    }
    Console.log((JSON.stringify(out, null, 2)));
    return out;
  }
}

