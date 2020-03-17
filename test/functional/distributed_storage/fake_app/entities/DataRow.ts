import {Column, Entity, PrimaryColumn, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class DataRow {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  someNumber: number;

  @Column()
  someString: string;

  @Column()
  someBool: boolean;

  @Column()
  someDate: Date;

  @Column()
  someAny: string;

}
