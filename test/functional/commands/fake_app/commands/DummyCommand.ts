import {Inject} from "typedi";
import {Storage} from "../../../../../src/libs/storage/Storage";
import {IStorageOptions} from "../../../../../src/libs/storage/IStorageOptions";

export class DummyCommand {

  @Inject(Storage.NAME)
  storage: Storage;

  command = "dummy";
  aliases = "d";
  describe = "Dummy";

  builder(yargs: any) {
    return yargs
  }

  async handler(argv: any): Promise<IStorageOptions> {
    let defaultStore = this.storage.get();
    return defaultStore['options'];
  }
}

