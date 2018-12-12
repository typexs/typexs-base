import {AbstractSchemaHandler} from "../../libs/storage/AbstractSchemaHandler";
import {NotYetImplementedError} from "../../libs/exceptions/NotYetImplementedError";
import {Collection} from "../../libs/storage/Collection";


export class DefaultSchemaHandler extends AbstractSchemaHandler {

  type: string = '__default__';


  getCollections(): Promise<Collection[]> {
    throw new NotYetImplementedError();
  }

  getCollectionNames(): Promise<string[]> {
    throw new NotYetImplementedError();
  }

  getCollection(name: string): Promise<Collection> {
    throw new NotYetImplementedError();
  }


}
