import {ICollectionProperty} from './ICollectionProperty';

export interface ICollection {
  framework: string;
  name: string;
  properties: ICollectionProperty[];

  [k: string]: any;
}


