import {AbstractSchemaHandler} from "../../../libs/storage/AbstractSchemaHandler";
import * as _ from "lodash";


export class SqliteSchemaHandler extends AbstractSchemaHandler {

  type: string = 'sqlite';

  async getCollectionNames(): Promise<string[]> {
    let c = await this.storageRef.connect();
    let q = await c.manager.query('SELECT name FROM sqlite_master WHERE type=\'table\';');
    return _.map(q, x => x.name);
  }


}
