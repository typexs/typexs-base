import {StorageRef} from "./StorageRef";
import {Collection} from "./Collection";

export abstract class AbstractSchemaHandler {

  readonly type: string;

  readonly storageRef: StorageRef;

  constructor(ref?: StorageRef) {
    this.storageRef = ref;
  }

  abstract getCollectionNames(): Promise<string[]>;

  async getCollection(name: string): Promise<any> {
    let c = await this.storageRef.connect();
    return await c.manager.connection.createQueryRunner().getTable(name);
  }

  async getCollections(names: string[]): Promise<Collection[]>{
    let c = await this.storageRef.connect();
    return await c.manager.connection.createQueryRunner().getTables(names);
  }

}
