import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class Truth {

  @PrimaryGeneratedColumn()
  id:number;

  @Column()
  isTrue: boolean;

}
