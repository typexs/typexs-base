import {SPAWN_TIMEOUT, TEST_MONGO_STORAGE_OPTIONS} from '../../config';
import * as _ from 'lodash';
import {IEventBusConfiguration} from 'commons-eventbus';
import {Config} from '@allgemein/config';
import {ITypexsOptions} from '../../../../src/libs/ITypexsOptions';
import {Bootstrap} from '../../../../src/Bootstrap';
import {generateMongoDataRows} from '../helper';
import {Injector} from '../../../../src/libs/di/Injector';
import {C_STORAGE_DEFAULT} from '../../../../src/libs/Constants';
import {StorageRef} from '../../../../src/libs/storage/StorageRef';

(async function () {
  const LOG_EVENT = !!process.argv.find(x => x === '--enable_log');
  let NODEID = process.argv.find(x => x.startsWith('--nodeId='));
  if (NODEID) {
    NODEID = NODEID.split('=').pop();
  } else {
    NODEID = 'fakeapp01';
  }

  const DB_OPTIONS = TEST_MONGO_STORAGE_OPTIONS;
  _.set(DB_OPTIONS, 'database', 'typexs_remote');
  let bootstrap = Bootstrap
    .setConfigSources([{type: 'system'}])
    .configure(<ITypexsOptions & any>{
      app: {name: 'remote_mongo_app', nodeId: 'remote_mongo_app', path: __dirname},
      logging: {enable: LOG_EVENT, level: 'debug'},
      modules: {paths: [__dirname + '/../../../..']},
      storage: {default: DB_OPTIONS},
      eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}},
      workers: {access: [{name: 'DistributedQueryWorker', access: 'allow'}]}
    });
  bootstrap.activateLogger();
  bootstrap.activateErrorHandling();
  await bootstrap.prepareRuntime();
  bootstrap = await bootstrap.activateStorage();
  bootstrap = await bootstrap.startup();
  process.send('startup');


  const entries = generateMongoDataRows();

  const storageRef = Injector.get(C_STORAGE_DEFAULT) as StorageRef;
  const controllerRef = storageRef.getController();
  await controllerRef.save(entries);

  const timeout = parseInt(Config.get('argv.timeout', SPAWN_TIMEOUT), 0);
  /*
  let commands = bootstrap.getCommands();
  expect(commands.length).to.be.gt(0);
  let command = _.find(commands, e => e.command == 'worker');
  command.handler({});
  */

  const t = setTimeout(async () => {
    await bootstrap.shutdown();
  }, timeout);

  let running = true;
  process.on(<any>'message', async (m: string) => {

    if (m === 'shutdown') {
      running = false;
      clearTimeout(t);
      await bootstrap.shutdown();
      process.exit(0);
    }
  });
  process.on('exit', async () => {
    if (running) {
      running = false;
      clearTimeout(t);
      await bootstrap.shutdown();
    }
  });


})();

