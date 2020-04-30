import {Column, Entity, ObjectIdColumn, PrimaryColumn, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class DataRow {

  @PrimaryColumn()
  id: number;

  @Column()
  someNumber: number;

  @Column()
  someString: string;

  @Column()
  someFlag: string;

  @Column()
  someBool: boolean;

  @Column()
  someDate: Date;

  @Column()
  someAny: any[];


}
