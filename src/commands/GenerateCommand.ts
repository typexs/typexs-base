import * as path from 'path';
import {Config} from "commons-config";
import {Bootstrap} from "../Bootstrap";

export class GenerateCommand {



  command = "generate ";
  aliases = "g";
  describe = "Generate schematics";

  builder(yargs: any) {
    return yargs
  }

  async handler(argv: any) {




  }
}

