import {Column, Entity, ObjectIdColumn} from 'typeorm';


@Entity()
export class MdbPerson {

  @ObjectIdColumn()
  id: string;


  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  age: number;


}
