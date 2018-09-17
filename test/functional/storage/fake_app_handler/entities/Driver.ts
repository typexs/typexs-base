import {Column, Entity, PrimaryColumn} from "typeorm";

@Entity()
export class Driver {

  @PrimaryColumn()
  id:number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

}
