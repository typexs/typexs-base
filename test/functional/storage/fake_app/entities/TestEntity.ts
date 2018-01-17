import {Column, Entity, PrimaryColumn} from "typeorm";

@Entity()
export class TestEntity {

  @PrimaryColumn()
  id:number;

  @Column()
  name: string;

}
