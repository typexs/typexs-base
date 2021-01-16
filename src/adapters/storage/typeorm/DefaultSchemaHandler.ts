import {NotYetImplementedError} from '@allgemein/base';
import {AbstractSchemaHandler} from '../../../libs/storage/AbstractSchemaHandler';
import {ICollection} from '../../../libs/storage/ICollection';
import {__DEFAULT__} from '../../../libs/Constants';


export class DefaultSchemaHandler extends AbstractSchemaHandler {

  type: string = __DEFAULT__;


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
