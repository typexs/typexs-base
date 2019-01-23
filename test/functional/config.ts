import {IStorageOptions} from "../../src";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";

export const TEST_STORAGE_OPTIONS: IStorageOptions = <SqliteConnectionOptions & IStorageOptions>{
  name: 'default',
  type: "sqlite",
  database: ":memory:",
  synchronize: true,
  connectOnStartup: true

  // tablesPrefix: ""

};
