import * as _ from 'lodash';
import {Storage} from '../libs/storage/Storage';
import {Log} from '../libs/logging/Log';
import {Inject} from 'typedi';
import {ICommand} from '../libs/commands/ICommand';
import {System} from '../libs/system/System';
import {TypeOrmStorageRef} from '../libs/storage/framework/typeorm/TypeOrmStorageRef';

export class StorageCommand implements ICommand {

  command = 'storage';

  aliases = 'st';

  describe = 'Storages';


  @Inject(Storage.NAME)
  storage: Storage;


  beforeStartup(): void {
    System.enableDistribution(false);
  }

  builder(yargs: any) {
    return yargs;
  }

  async handler(argv: any) {
    let parts = _.clone(argv._);
    if (!parts) {
      parts = [];
    }

    let subcommand = parts.shift();
    subcommand = parts.shift();
    if (!subcommand) {
      Log.info('No storage command to execute.');
      return;
    }

    if (!this[subcommand]) {
      return Log.info('No subcommand method to execute found for ' + subcommand + '.');
    }

    const storageName = parts.shift();

    return await this[subcommand](storageName, parts, argv);
  }


  async dump(storageName: string, parts: string[], argv: any) {
    if (!storageName) {
      Log.info('No storage for dump defined.');
      return;
    }

    const storageRef: TypeOrmStorageRef = this.storage.get(storageName);
    if (!storageRef) {
      Log.info('No storage ref for "' + storageName + '" defined.');
      return;
    }

    if (parts.length === 0) {
      parts = await storageRef.getSchemaHandler().getCollectionNames();
    }

    const c = await storageRef.connect();
    const data = await c.manager.connection.createQueryRunner().getTables(parts);
    await c.close();
    console.log(JSON.stringify(data, null, 2));
  }


  async config(storageName: string, parts: string[], argv: any) {
    if (!storageName) {
      console.log(JSON.stringify(this.storage.getAllOptions(), null, 2));
      return;
    }

    const storageRef = this.storage.get(storageName);
    if (!storageRef) {
      Log.info('No storage ref for "' + storageName + '" defined.');
      return;
    }

    console.log(JSON.stringify(storageRef.getOptions(), null, 2));
  }
}

