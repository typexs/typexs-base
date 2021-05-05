import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class ObjectWithJson {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: any;

}
