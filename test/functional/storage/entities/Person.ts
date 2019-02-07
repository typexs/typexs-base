import {Column, Entity, PrimaryColumn} from "typeorm";
import {IsEmail, MinLength} from "class-validator";

@Entity()
export class Person {

  @PrimaryColumn()
  id: number;

  @MinLength(4)
  @Column()
  firstName: string;

  @MinLength(4)
  @Column()
  lastName: string;

  @IsEmail()
  @Column()
  eMail: string;

}
