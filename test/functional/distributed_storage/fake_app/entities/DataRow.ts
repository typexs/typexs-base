import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class DataRow {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  someNumber: number;

  @Column()
  someString: string;

  @Column({nullable: true})
  someFlag: string;

  @Column()
  someBool: boolean;

  @Column()
  someDate: Date;

  @Column({nullable: true})
  someAny: string;

}
