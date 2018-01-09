import * as _ from 'lodash';
import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import {IStorageOptions} from "../../../src";
import * as path from "path";
import {Bootstrap} from "../../../src/Bootstrap";
import {Config} from "commons-config";


@suite('functional/storage/general')
class GeneralSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }


  @test
  async 'storage options override'() {
    let opt1: IStorageOptions = {name: 'default', type: 'sqlite', entityPrefix: 'test'};
    let opt2: IStorageOptions = {name: 'default2', type: 'postgres'};
    let options: IStorageOptions = _.merge(opt1, opt2);
    expect(options).to.be.deep.eq({name: 'default2', type: 'postgres', entityPrefix: 'test'});
  }


  @test
  async 'storage bootstrap'() {
    let appdir = path.join(__dirname, 'fake_app');
    let bootstrap = await Bootstrap.configure({app: {path: appdir}}).prepareRuntime();
    bootstrap = await bootstrap.activateStorage();

    let storageManager = bootstrap.getStorage();
    let storage = storageManager.get();

    expect(storage['options']).to.deep.include({
      name: 'default',
      type: 'sqlite',
      database: ':memory:'
    });

    let entityNames = [];
    for (let fn of storage['options']['entities']) {
      entityNames.push((<Function>fn).prototype.constructor.name);
    }
    expect(entityNames).to.be.deep.eq([
      'ModuleEntity', 'TestEntity'
    ]);
  }


}

