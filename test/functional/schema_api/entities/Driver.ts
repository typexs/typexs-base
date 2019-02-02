import {Column, Entity, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn} from "typeorm";
import {Car} from "./Car";

@Entity()
export class Driver {

  @PrimaryGeneratedColumn()
  id:number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @ManyToOne(type => Car, user => user.driver)
  car:Car;
}
