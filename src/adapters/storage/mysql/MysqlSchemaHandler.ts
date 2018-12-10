import {AbstractSchemaHandler} from "../../../libs/storage/AbstractSchemaHandler";
import * as _ from "lodash";
import {MysqlConnectionOptions} from "typeorm/driver/mysql/MysqlConnectionOptions";


export class MysqlSchemaHandler extends AbstractSchemaHandler {

  type: string = 'mysql';

  async getCollectionNames(): Promise<string[]> {
    let c = await this.storageRef.connect();
    let database = (<MysqlConnectionOptions>this.storageRef.getOptions()).database;
    let q = await c.manager.query('SELECT table_name FROM information_schema.tables WHERE table_schema=\''+database+'\';');
    return _.map(q, x => x.table_name);
  }


}
