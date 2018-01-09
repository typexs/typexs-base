
import "reflect-metadata";

import {Bootstrap} from "./../Bootstrap";
import {ConfigHandler, SystemConfig} from "commons-config";
import {Log} from "./../libs/logging/Log";

export function cli(){
// todo ... make this configurable
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// need be done at this point, if not,  ConfigHandler has an undefined a
  ConfigHandler.reload();

  let sysCfg = new SystemConfig();
  let jar = sysCfg.create();
  let cfg = jar.get('argv.config');

  return Bootstrap
    .configure(cfg)
    .activateLogger()
    .activateErrorHandling()
    .prepareRuntime()
    .then(bootstrap => {
      return bootstrap.activateStorage();
    })
    .then(bootstrap => {
      require("yargonaut")
        .style("blue")
        .style("yellow", "required")
        .helpStyle("green")
        .errorsStyle("red");

      let yargs = require("yargs")
        .usage("Usage: $0 <command> [options]");

      for (let command of bootstrap.getCommands()) {
        yargs.command(command);
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

    })
    .catch(err => {
      Log.error(err)
    });

}
