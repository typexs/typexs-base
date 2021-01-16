import 'reflect-metadata';

import {Bootstrap} from './../Bootstrap';
import {ConfigHandler, SystemConfig} from '@allgemein/config';
import {ICommand} from '../libs/commands/ICommand';

export async function cli(): Promise<Bootstrap> {

  require('yargonaut')
    .style('blue')
    .style('yellow', 'required')
    .helpStyle('green')
    .errorsStyle('red');

  // todo ... make this configurable
  // process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// need be done at this point, if not,  ConfigHandler has an undefined a
  ConfigHandler.reload();

  const sysCfg = new SystemConfig();
  const jar = sysCfg.create();
  const cfg = jar.get('argv.config');
  const bootstrap = Bootstrap.configure(cfg);


  await bootstrap
    .activateErrorHandling()
    .prepareRuntime();

  let selectedCommand: ICommand = null;
  const yargs2 = require('yargs').usage('Usage: $0 <command> [options]');
  for (const command of bootstrap.getCommands(false)) {
    const c: any = {
      command: command.command,
      aliases: command.aliases,
      describe: command.describe
    };

    if (command.builder) {
      c.builder = command.builder.bind(command);
      c.handler = () => selectedCommand = command;
    }
    yargs2.command(c);
  }


  const argv = yargs2.demandCommand(1)
    .option('config', {
      alias: 'c',
      describe: 'JSON string with configuration or name of the config file.',
      'default': false
    })
    .option('verbose', {
      alias: '-v',
      describe: 'Enable logging.',
      'default': false
    })
    .coerce('verbose', (c: any) => {
      Bootstrap.verbose(c);
    })
    .help('h')
    .alias('h', 'help')
    .argv;

  if (selectedCommand) {
    bootstrap.activateLogger();
    if (selectedCommand.beforeStorage) {
      await selectedCommand.beforeStorage();
    }
    await bootstrap.activateStorage();
    await bootstrap.startup(selectedCommand);
    await bootstrap.execCommand(selectedCommand.constructor, argv);
    await bootstrap.shutdown();
  }
  return bootstrap;
}
