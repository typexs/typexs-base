import {Column, Entity, ObjectIdColumn} from 'typeorm';

import {MdbDriver} from './MdbDriver';

@Entity()
export class MdbCar {

  @ObjectIdColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  driver: MdbDriver[];
}
