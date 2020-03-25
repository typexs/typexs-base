import {IEntityRef} from 'commons-schema-api/browser';

export interface IConditionJoin {
  alias: string;
  table: string;
  condition: string;
  ref: IEntityRef;
}
