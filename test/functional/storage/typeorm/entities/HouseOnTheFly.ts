import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class HouseOnTheFly {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  street: string;

  @Column()
  houseno: number;

}
