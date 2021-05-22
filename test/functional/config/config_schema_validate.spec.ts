// process.env.SQL_LOG = '1';
import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {NAMESPACE_CONFIG} from '../../../src/libs/config/Constants';
import {ConfigLoader} from '../../../src/libs/config/ConfigLoader';
import {Activator} from '../../../src/Activator';
import {IClassRef, JsonSchema, METATYPE_CLASS_REF, RegistryFactory} from '@allgemein/schema-api';

let ajv: any = null;
let rootRef: IClassRef;
let jsonSchema: any;
let appRef: any;
let appJSchema: any;
let configLoader: ConfigLoader;

@suite('functional/config/schema_validate')
class ConfigSchemaValidateSpec {


  static async before() {
    const activator = new Activator();
    configLoader = new ConfigLoader();
    await configLoader.applySchema(activator.configSchema()) as IClassRef;
    rootRef = RegistryFactory.get(NAMESPACE_CONFIG).find(METATYPE_CLASS_REF, (x: IClassRef) => x.name === 'Config') as IClassRef;
    appRef = RegistryFactory.get(NAMESPACE_CONFIG).find(METATYPE_CLASS_REF, (x: IClassRef) => x.name === 'App') as IClassRef;
    jsonSchema = await JsonSchema.serialize(rootRef);
    appJSchema = await JsonSchema.serialize(appRef);
    const Ajv = await import('ajv');
    ajv = new Ajv();
  }


  static after() {
    RegistryFactory.remove(NAMESPACE_CONFIG);
    ajv = null;
    rootRef = null;
    jsonSchema = null;
    appRef = null;
    appJSchema = null;
    configLoader = null;
  }


  @test
  async 'validate positive over ajv '() {
    const validate = ajv.compile(jsonSchema);

    const config = {
      app: {
        name: 'app',
        path: 'some-path'
      }
    };

    const result = validate(config);
    expect(result).to.be.true;
  }

  @test
  async 'validate failing over ajv - without required property'() {
    const validate = ajv.compile(jsonSchema);

    const config = {
      app: {
        path: 'some-path'
      }
    };

    const result = validate(config);
    expect(result).to.be.false;
    expect(validate.errors).to.be.deep.eq([
      {
        keyword: 'required',
        dataPath: '.app',
        schemaPath: '#/definitions/App/required',
        params: {missingProperty: 'name'},
        message: 'should have required property \'name\''
      }
    ]);
  }


  @test
  async 'validate positive on inner element over ajv '() {
    const validate = ajv.compile(appJSchema);

    const config = {
      name: 'app',
    };

    const result = validate(config);
    expect(result).to.be.true;
  }


  @test
  async 'validate failing on inner element over ajv - without required property'() {
    const validate = ajv.compile(appJSchema);

    const config = {};

    const result = validate(config);
    expect(result).to.be.false;
    expect(validate.errors).to.be.deep.eq([
      {
        keyword: 'required',
        dataPath: '',
        schemaPath: '#/definitions/App/required',
        params: {missingProperty: 'name'},
        message: 'should have required property \'name\''
      }
    ]);
  }


  @test
  async 'validate positive over config loader'() {
    const config = {
      app: {
        name: 'app',
        path: 'some-path'
      }
    };
    const result = await configLoader.validate(config);
    expect(result).to.be.deep.eq({valid: true, errors: null});
  }


  @test
  async 'validate failing over config loader - without required property'() {
    const config = {
      app: {
        path: 'some-path'
      }
    };

    const result = await configLoader.validate(config);
    expect(result).to.be.deep.eq({
      valid: false,
      errors: [
        {
          keyword: 'required',
          dataPath: '.app',
          schemaPath: '#/definitions/App/required',
          params: {missingProperty: 'name'},
          message: 'should have required property \'name\''
        }
      ]
    });
  }


  @test
  async 'validate positive on inner element over config loader'() {
    const config = {
      name: 'app',
    };
    const result = await configLoader.validate(config, 'app');
    expect(result).to.be.deep.eq({valid: true, errors: null});
  }


  @test
  async 'validate failing on inner element over config loader - without required property'() {
    const config = {};
    const result = await configLoader.validate(config, 'app');
    expect(result).to.be.deep.eq({
      valid: false, errors: [
        {
          keyword: 'required',
          dataPath: '',
          schemaPath: '#/definitions/App/required',
          params: {missingProperty: 'name'},
          message: 'should have required property \'name\''
        }
      ]
    });
  }


}

