// process.env.SQL_LOG = '1';
import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {DEFAULT_CONFIG_LOAD_ORDER, ENV_CONFIG_LOAD_KEY, NAMESPACE_CONFIG} from '../../../src/libs/config/Constants';
import {PlatformUtils} from '@allgemein/base';
import {ConfigLoader} from '../../../src/libs/config/ConfigLoader';
import {Activator} from '../../../src/Activator';
import {isClassRef} from '@allgemein/schema-api/api/IClassRef';
import {IClassRef, JsonSchema, RegistryFactory} from '@allgemein/schema-api';
import {CONFIG_SCHEMA_FOR_GREAT_STUFF} from './app/schema/config_demo_with_new_context.schema';
import {inspect} from 'util';
import {ConfigLoadOrder} from '../../../src/libs/config/ConfigLoadOrder';

@suite('functional/config/commands')
class ConfigSchemaSpec {

  @test.skip
  async 'list used configuration files'() {
    const res = {};
    // const data = {}
    expect(false).to.be.true;
    // expect(data).to.deep.eq(DEFAULT_CONFIG_LOAD_ORDER);
  }

  @test.skip
  async 'show configuration'() {
    const res = {};
    // const data = {}
    expect(false).to.be.true;
    // expect(data).to.deep.eq(DEFAULT_CONFIG_LOAD_ORDER);
  }

  @test.skip
  async 'show config schema'() {
    const res = {};
    // const data = {}
    expect(false).to.be.true;
    // expect(data).to.deep.eq(DEFAULT_CONFIG_LOAD_ORDER);
  }

  @test.skip
  async 'validate configuration'() {
    const res = {};
    // const data = {}
    expect(false).to.be.true;
    // expect(data).to.deep.eq(DEFAULT_CONFIG_LOAD_ORDER);
  }
}

