// process.env.SQL_LOG = '1';
import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {ENV_CONFIG_LOAD_KEY, NAMESPACE_CONFIG} from '../../../src/libs/config/Constants';
import {PlatformUtils} from '@allgemein/base';
import {ConfigLoader} from '../../../src/libs/config/ConfigLoader';
import {Activator} from '../../../src/Activator';
import {isClassRef} from '@allgemein/schema-api/api/IClassRef';
import {IClassRef, JsonSchema, RegistryFactory} from '@allgemein/schema-api';
import {CONFIG_SCHEMA_FOR_GREAT_STUFF} from './app/schema/config_demo_with_new_context.schema';

let startingDir: string = null;
let workDir: string = null;

@suite('functional/config/schema')
class ConfigSchemaSpec {


  static before() {
    startingDir = process.cwd();
    workDir = PlatformUtils.workdir;
    PlatformUtils.workdir = null;
    RegistryFactory.remove(NAMESPACE_CONFIG);
  }

  static after() {
    PlatformUtils.workdir = workDir;
    RegistryFactory.remove(NAMESPACE_CONFIG);
  }


  before() {
    RegistryFactory.remove(NAMESPACE_CONFIG);
    delete process.env[ENV_CONFIG_LOAD_KEY];
    process.chdir(startingDir);
  }


  after() {
    delete process.env[ENV_CONFIG_LOAD_KEY];
    process.chdir(startingDir);
  }


  @test
  async 'load default schema'() {
    const activator = new Activator();
    const configLoader = new ConfigLoader();
    const result = await configLoader.applySchema(activator.configSchema()) as IClassRef;
    expect(result).to.not.be.null;
    expect(isClassRef(result)).to.be.true;
    expect(result.name).to.be.eq('Config');
    const entities = configLoader.getRegistry().listEntities();
    expect(entities.map(x => x.name)).to.include.members(['App']);
    const res = JsonSchema.serialize(result);
    expect(res.definitions.App).to.deep.eq({
      '$id': '#App',
      'additionalProperties': false,
      'properties': {
        'enableShutdownOnUncaughtException': {
          'description': 'TODO',
          'type': 'boolean'
        },
        'name': {
          'description': 'Name of the application. Also used for additional config file name pattern.',
          'type': 'string'
        },
        'nodeId': {
          'description': 'Node id for this instance.',
          'type': 'string'
        },
        'path': {
          'description': 'Path to the application, if not the same as the of the installation.',
          'type': 'string'
        },
        'system': {
          '$ref': '#/definitions/System'
        }
      },
      'required': [
        'name'
      ],
      'title': 'App',
      'type': 'object'
    });
  }


  @test
  async 'aggregate multiple schemas'() {
    const activator = new Activator();
    const configLoader = new ConfigLoader();
    // apply default
    let result = await configLoader.applySchema(activator.configSchema()) as IClassRef;
    expect(result).to.not.be.null;
    let entities = configLoader.getRegistry().listEntities();
    expect(entities).to.have.length.gte(1);
    result = await configLoader.applySchema(CONFIG_SCHEMA_FOR_GREAT_STUFF) as IClassRef;
    expect(isClassRef(result)).to.be.true;
    expect(result.name).to.be.eq('Config');
    entities = configLoader.getRegistry().listEntities();
    expect(entities).to.have.length.gte(2);
    expect(entities.map(x => x.name)).to.include.members(['App', 'Great']);
    const res = JsonSchema.serialize(result);
    expect(res.definitions.Great).to.deep.eq({
      '$id': '#Great',
      title: 'Great',
      type: 'object',
      properties: {
        stuff: {type: 'string', description: 'Really great stuff property!'}
      }
    });

  }

}

