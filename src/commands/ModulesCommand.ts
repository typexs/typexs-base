import * as path from 'path';
import {Config} from "commons-config";
import {Bootstrap} from "../Bootstrap";

export class ModulesCommand {

  command = "modules";
  aliases = "m";
  describe = "List modules";

  builder(yargs: any) {
    return yargs
  }

  async handler(argv: any) {

    console.log(Bootstrap._().getModules());
  }
}

