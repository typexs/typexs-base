import {Config} from "commons-config";
import {ICommand} from "../libs/commands/ICommand";
import {Log} from "..";

export class ConfigCommand implements ICommand {


  command = "config [key]";

  aliases = "c";

  describe = "Show config or config element";


  builder(yargs: any) {
    return yargs
  }

  beforeStorage(): void {
    Log.options({enable: false, loggers: [{name: '*', enable: false}]}, false);
  }


  async handler(argv: any) {
    if (argv.key) {
      console.log(JSON.stringify(Config.get(argv.key), null, 2));
    } else {
      console.log(JSON.stringify(Config.all(), null, 2));
    }
  }
}
