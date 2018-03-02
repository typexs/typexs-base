import {BeforeInsert, Column, Entity, PrimaryColumn} from "typeorm";

@Entity()
export class X1 {

  @PrimaryColumn()
  id: number;

  @Column()
  txt:string;

  test:boolean = false;

  @BeforeInsert()
  t(){
    this.test = true;
  }
}
