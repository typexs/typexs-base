import {IEntityRef} from '@allgemein/schema-api';

export interface IConditionJoin {
  alias: string;
  table: string;
  condition: string;
  ref: IEntityRef;
}
