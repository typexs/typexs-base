import {AbstractSchemaHandler} from "../../../libs/storage/AbstractSchemaHandler";
import * as _ from "lodash";


export class PostgresSchemaHandler extends AbstractSchemaHandler {

  type: string = 'postgres';

  async getCollectionNames(): Promise<string[]> {
    let c = await this.storageRef.connect();
    let q = await c.manager.query('SELECT table_name as name FROM information_schema.tables WHERE table_type=\'BASE TABLE\';');
    return _.map(q, x => x.name);
  }


}
