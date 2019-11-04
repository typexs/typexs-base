import {Column, Entity, ObjectIdColumn} from 'typeorm';
import {MdbCar} from './MdbCar';


@Entity()
export class MdbDriver {

  @ObjectIdColumn()
  id: string;


  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  car: MdbCar;
}
