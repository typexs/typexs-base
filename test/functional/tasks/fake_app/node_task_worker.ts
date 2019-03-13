import {Bootstrap, ITypexsOptions} from "../../../../src";
import {TEST_STORAGE_OPTIONS} from "../../config";
import {IEventBusConfiguration} from "commons-eventbus";
import {expect} from "chai";
import * as _ from "lodash";

(async function () {
  let bootstrap = Bootstrap
    .setConfigSources([{type: 'system'}])
    .configure(<ITypexsOptions & any>{
      app: {name: 'fakeapp01', nodeId: 'fakeapp01', path: __dirname},
      logging: {enable: true, level: 'debug'},
      modules: {paths: [__dirname + '/../../../..']},
      storage: {default: TEST_STORAGE_OPTIONS},
      //cache: {bins: {default: 'redis1'}, adapter: {redis1: {type: 'redis', host: '127.0.0.1', port: 6379}}},
      eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}}
    });
  bootstrap.activateLogger();
  bootstrap.activateErrorHandling();
  await bootstrap.prepareRuntime();
  bootstrap = await bootstrap.activateStorage();
  bootstrap = await bootstrap.startup();

  let commands = bootstrap.getCommands();
  expect(commands.length).to.be.gt(0);

  let command = _.find(commands, e => e.command == 'task-worker');
  command.handler({});

  setTimeout(async () => {
    await bootstrap.shutdown();
  }, 1000);
})();

