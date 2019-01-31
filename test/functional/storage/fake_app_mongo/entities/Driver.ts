import {Column, Entity, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, ObjectIdColumn} from "typeorm";
import {Car} from "./Car";


@Entity()
export class Driver {

  @ObjectIdColumn()
  id: string;


  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  car: Car;
}
