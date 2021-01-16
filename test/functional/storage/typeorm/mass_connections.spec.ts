import * as _ from 'lodash';
import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {Config} from '@allgemein/config';
import {Bootstrap} from '../../../../src/Bootstrap';
import {TypeOrmStorageRef} from '../../../../src/libs/storage/framework/typeorm/TypeOrmStorageRef';
import {
  EVENT_STORAGE_REF_PREPARED,
  EVENT_STORAGE_REF_SHUTDOWN
} from '../../../../src/libs/storage/framework/typeorm/Constants';


let bootstrap: Bootstrap;

@suite('functional/storage/typeorm/mass_connections')
class StorageGeneralSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }


  async after() {
    if (bootstrap) {
      await bootstrap.shutdown();
    }
  }


  @test
  async 'mass connections on psql'() {
    bootstrap = await Bootstrap.setConfigSources([{type: 'system'}]).configure({
      app: {path: '.'},
      modules: {paths: [__dirname + '/../../../..']},
      storage: {
        default: {
          synchronize: true,
          type: 'postgres',
          database: 'txsbase',
          username: 'txsbase',
          password: '',
          host: '127.0.0.1',
          port: 5436,
        } as any
      }
    }).prepareRuntime();
    bootstrap = await bootstrap.activateStorage();

    const storageManager = bootstrap.getStorage();
    const storage: TypeOrmStorageRef = storageManager.get();

    const connections = [];
    for (const i of _.range(0, 1001)) {
      const c = await storage.connect();
      // console.log(i + ' ' + storage.listenerCount(EVENT_STORAGE_REF_PREPARED) + ' ' + storage.listenerCount(EVENT_STORAGE_REF_SHUTDOWN));
      connections.push(c);
    }

    await Promise.all(connections.map(x => x.close()));
    expect(storage.listenerCount(EVENT_STORAGE_REF_PREPARED)).to.be.eq(0);
    expect(storage.listenerCount(EVENT_STORAGE_REF_SHUTDOWN)).to.be.eq(0);

  }

}

