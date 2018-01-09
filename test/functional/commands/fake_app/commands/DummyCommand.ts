import {Inject} from "typedi";
import {IStorageOptions, Storage} from "../../../../../src";

export class DummyCommand {

  @Inject()
  storage: Storage;

  command = "dummy";
  aliases = "d";
  describe = "Dummy";

  builder(yargs: any) {
    return yargs
  }

  async handler(argv: any):Promise<IStorageOptions> {
    let defaultStore = this.storage.get();
    return defaultStore['options'];
  }
}

