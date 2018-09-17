import {Column, Entity, PrimaryColumn} from "typeorm";

@Entity()
export class Car {

  @PrimaryColumn()
  id:number;

  @Column()
  name: string;

}
