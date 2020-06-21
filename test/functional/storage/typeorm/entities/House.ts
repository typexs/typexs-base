import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class House {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  street: string;

  @Column()
  houseno: number;

}
