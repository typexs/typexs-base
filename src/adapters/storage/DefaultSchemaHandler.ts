import {AbstractSchemaHandler} from '../../libs/storage/AbstractSchemaHandler';
import {NotYetImplementedError} from 'commons-base';
import {ICollection} from '../../libs/storage/ICollection';



export class DefaultSchemaHandler extends AbstractSchemaHandler {

  type: string = '__default__';


  getCollections(): Promise<ICollection[]> {
    throw new NotYetImplementedError();
  }

  getCollectionNames(): Promise<string[]> {
    throw new NotYetImplementedError();
  }

  getCollection(name: string): Promise<ICollection> {
    throw new NotYetImplementedError();
  }


}
