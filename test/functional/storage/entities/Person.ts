import {Column, Entity, PrimaryColumn} from 'typeorm';
import {IsEmail, Required} from '@allgemein/schema-api';
import {MinLength} from '@allgemein/schema-api/decorators/validate';

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


@Entity()
export class PersonWithRequired {

  @PrimaryColumn()
  id: number;

  @Required()
  @MinLength(4)
  @Column()
  firstName: string;

  @Required()
  @MinLength(4)
  @Column()
  lastName: string;

  @Required()
  @IsEmail()
  @Column()
  eMail: string;

}
