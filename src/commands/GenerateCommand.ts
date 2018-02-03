import {RuntimeLoader} from "../base/RuntimeLoader";
import {Inject} from "typedi";

export class GenerateCommand {


  @Inject(RuntimeLoader.name)
  loader: RuntimeLoader;


  command = "generate [schematic]";
  aliases = "g";
  describe = "Generate schematics";


  builder(yargs: any) {
    return yargs
  }

  async handler(argv: any) {





  }
}

