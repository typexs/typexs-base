import {Config} from "commons-config";
import {Bootstrap} from "../Bootstrap";
import {ICommand} from "../libs/commands/ICommand";
import {IModule} from "../api/IModule";

import {inspect} from "util";

export class ModulesCommand implements ICommand {

  command = "modules";
  aliases = "m";
  describe = "List modules";

  builder(yargs: any) {
    return yargs
  }

  async handler(argv: any) {

    let modules: IModule[] = Bootstrap._().getModules();

    if (Config.get('argv.json', false)) {
      console.log(inspect(modules, false, 10));
    } else {
      for (let modul of modules) {
        console.log('- Modul: ' + modul.name + ' ' + modul.version + ' (internal: ' + modul.internal + ')');
      }

    }
  }
}

