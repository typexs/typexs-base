import {BeforeInsert, Entity} from "typeorm";
import {X1} from "./X1";

@Entity()
export class Y1 extends X1 {

  test2: boolean = false;

  @BeforeInsert()
  t2() {
    this.test2 = true;
  }

}
