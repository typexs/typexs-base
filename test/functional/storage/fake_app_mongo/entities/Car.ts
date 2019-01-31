import {Column, Entity, PrimaryGeneratedColumn, OneToMany, ObjectIdColumn} from "typeorm";

import {Driver} from "./Driver";

@Entity()
export class Car {

  @ObjectIdColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  driver: Driver[];
}
