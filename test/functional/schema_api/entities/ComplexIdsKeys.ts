import {Entity, PrimaryColumn} from "typeorm";


@Entity()
export class ComplexIdsKeys {

  @PrimaryColumn()
  inc: number;

  @PrimaryColumn()
  code: string;

}
