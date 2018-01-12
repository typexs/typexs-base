
import "reflect-metadata";

import {Bootstrap} from "./../Bootstrap";
import {ConfigHandler, SystemConfig} from "commons-config";
import {Log} from "./../libs/logging/Log";

export function cli():Promise<Bootstrap>{
// todo ... make this configurable
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// need be done at this point, if not,  ConfigHandler has an undefined a
  ConfigHandler.reload();

  let sysCfg = new SystemConfig();
  let jar = sysCfg.create();
  let cfg = jar.get('argv.config');
  let bootstrap = Bootstrap.configure(cfg);

  return bootstrap
    .activateLogger()
    .activateErrorHandling()
    .prepareRuntime()
    .then(_bootstrap => {
      return _bootstrap.activateStorage();
    })
    .then(_bootstrap => {
      return _bootstrap.startup();
    })
    .then(_bootstrap => {
      require("yargonaut")
        .style("blue")
        .style("yellow", "required")
        .helpStyle("green")
        .errorsStyle("red");

      let yargs = require("yargs")
        .usage("Usage: $0 <command> [options]");

      for (let command of _bootstrap.getCommands()) {
        let yargsCommand:any = {};

        if(command.command){
          yargsCommand.command = command.command
        }

        if(command.aliases){
          yargsCommand.aliases = command.aliases
        }

        if(command.describe){
          yargsCommand.describe = command.describe
        }

        if(command.builder){
          yargsCommand.builder = command.builder.bind(command)
        }

        if(command.handler){
          yargsCommand.handler = command.handler.bind(command)
        }

        yargs.command(yargsCommand);
      }

      yargs
        .option("config", {
          alias: 'c',
          describe: "JSON string with configuration or name of the config file.",
          'default': false
        })
        .option("verbose", {
          alias: '-v',
          describe: "Enable logging.",
          'default': false
        })
        .coerce('verbose', (c: any) => {
          Bootstrap.verbose(c)
        })
        .demandCommand(1)
        .help("h")
        .alias("h", "help")
        .argv;

      return _bootstrap;
    })
    .catch(err => {
      Log.error(err);
      throw err;
    });

}
