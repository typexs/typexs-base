import {AbstractSchemaHandler} from "../../libs/storage/AbstractSchemaHandler";
import * as _ from "lodash";
import {MongoQueryRunner} from "typeorm/driver/mongodb/MongoQueryRunner"
import {ICollection} from "../../libs/storage/ICollection";
import {ICollectionProperty} from "../../libs/storage/ICollectionProperty";
import {ConnectionWrapper} from "../..";


export class MongoDbSchemaHandler extends AbstractSchemaHandler {

  type: string = 'mongodb';

  private getDB(c: ConnectionWrapper) {
    let runner = <MongoQueryRunner>c.manager.connection.createQueryRunner();
    let database = c.manager.connection.driver.database;
    return runner.databaseConnection.db(database);

  }

  async getCollectionNames(): Promise<string[]> {
    let c = await this.storageRef.connect();
    let cursor = this.getDB(c).listCollections(null);
    let v;
    let names: string[] = [];
    while (v = await cursor.next()) {
      names.push(v.name);
    }
    await c.close();
    return names;
  }


  async getCollection(name: string): Promise<any> {
    let c = await this.storageRef.connect();
    let collection = this.getDB(c).listCollections({name: name});
    let res = await collection.next();
    await c.close()
    return res;
  }

  async getCollections(names: string[]): Promise<ICollection[]> {
    let c = await this.storageRef.connect();
    let collections = this.getDB(c).listCollections({name: {$in: names}});

    let colls: ICollection[] = [];
    let cursor: any;
    while (cursor = await collections.next()) {
      let props: ICollectionProperty[] = [];

      let _c: ICollection = {
        name: cursor.name,
        framework: 'typeorm',
        properties: props
      };

      _.keys(cursor).filter(x => x != 'columns').map(k => {
        _c[k] = cursor[k];
      });

      colls.push(_c);
    }
    ;

    return colls;
  }


}
