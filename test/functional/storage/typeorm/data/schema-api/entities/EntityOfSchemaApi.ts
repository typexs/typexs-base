import {Entity, Property} from '@allgemein/schema-api';


@Entity({namespace: 'typeorm'})
export class EntityOfSchemaApi {

  @Property({identifier: true})
  id: number;

  @Property()
  strValue: string;

  @Property()
  nrValue: number;

}
