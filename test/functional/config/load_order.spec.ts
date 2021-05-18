// process.env.SQL_LOG = '1';
import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {ConfigLoadOrder} from '../../../src/libs/config/ConfigLoadOrder';
import {DEFAULT_CONFIG_LOAD_ORDER, ENV_CONFIG_LOAD_KEY} from '../../../src/libs/config/Constants';
import {FileUtils, PlatformUtils} from '@allgemein/base';

let startingDir: string = null;
let workDir: string = null;

@suite('functional/config/load_oder')
class ConfigRedisSpec {


  static before() {
    startingDir = process.cwd();
    workDir = PlatformUtils.workdir;
    PlatformUtils.workdir = null;
  }

  static after() {
    PlatformUtils.workdir = workDir;
  }


  before() {
    delete process.env[ENV_CONFIG_LOAD_KEY];
    process.chdir(startingDir);
  }


  after() {
    delete process.env[ENV_CONFIG_LOAD_KEY];
    process.chdir(startingDir);
  }


  @test
  async 'load default order'() {
    const configLoadOrder = new ConfigLoadOrder();
    const res = configLoadOrder.detect();
    const data = configLoadOrder.get();
    expect(res).to.be.true;
    expect(data).to.deep.eq(DEFAULT_CONFIG_LOAD_ORDER);
  }

  @test
  async 'load from json data passed by env key'() {
    const testdata = [{
      type: 'file', file: '${argv.configfile}'
    }];
    process.env[ENV_CONFIG_LOAD_KEY] = JSON.stringify(testdata);
    const configLoadOrder = new ConfigLoadOrder();
    const res = configLoadOrder.detect();
    const data = configLoadOrder.get();
    expect(res).to.be.true;
    expect(data).to.deep.eq(testdata);
  }

  @test
  async 'load from file data passed by env key'() {
    process.chdir(__dirname + '/app/load_order');
    process.env[ENV_CONFIG_LOAD_KEY] = 'env-config.json';

    const configLoadOrder = new ConfigLoadOrder();
    const res = configLoadOrder.detect();
    const data = configLoadOrder.get();
    expect(res).to.be.true;
    expect(data).to.deep.eq(FileUtils.getJsonSync(__dirname + '/app/load_order/env-config.json'));
  }


  @test
  async 'load from predefined config-load.json file'() {
    process.chdir(__dirname + '/app/load_order/predefined');
    const configLoadOrder = new ConfigLoadOrder();
    const res = configLoadOrder.detect();
    const data = configLoadOrder.get();
    expect(res).to.be.true;
    expect(data).to.deep.eq(FileUtils.getJsonSync(__dirname + '/app/load_order/predefined/config-load.json'));
  }

  @test
  async 'load from predefined config-load.json file in config path '() {
    process.chdir(__dirname + '/app/load_order/predefined_config');
    const configLoadOrder = new ConfigLoadOrder();
    const res = configLoadOrder.detect();
    const data = configLoadOrder.get();
    expect(res).to.be.true;
    expect(data).to.deep.eq(FileUtils.getJsonSync(__dirname + '/app/load_order/predefined_config/config/config-load.json'));
  }

}

