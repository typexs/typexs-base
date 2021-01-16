import {IEventBusConfiguration} from 'commons-eventbus';
import {Config} from '@allgemein/config';
import {ITypexsOptions} from '../../../../../src/libs/ITypexsOptions';
import {SPAWN_TIMEOUT, TEST_STORAGE_OPTIONS} from '../../../config';
import {Bootstrap} from '../../../../../src/Bootstrap';

(async function () {
  const LOG_EVENT = !!process.argv.find(x => x === '--enable_log');
  let bootstrap = Bootstrap
    .setConfigSources([{type: 'system'}])
    .configure(<ITypexsOptions & any>{
      app: {name: 'fakeapp01', nodeId: 'remote_fakeapp01', path: __dirname},
      logging: {
        enable: LOG_EVENT,
        level: 'debug',
        transports: [{console: {}}],
        loggers: [{name: '*', level: 'debug', transports: [{console: {}}]}]
      },

      modules: {paths: [__dirname + '/../../../../..']},
      storage: {default: TEST_STORAGE_OPTIONS},
      eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}},
      workers: {access: [{name: 'ExchangeMessageWorker', access: 'allow'}]},
      filesystem: {paths: ['.']}
    });
  bootstrap.activateLogger();
  bootstrap.activateErrorHandling();
  await bootstrap.prepareRuntime();
  bootstrap = await bootstrap.activateStorage();
  bootstrap = await bootstrap.startup();

  process.send('startup');


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

