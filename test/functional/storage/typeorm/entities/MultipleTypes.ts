import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class MultipleTypes {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  number: number;

  @Column()
  string: string;

  @Column()
  boolean: boolean;

  @Column()
  date: Date;

  @Column()
  buffer: Buffer;

  @Column()
  object: object;


  @Column()
  bigint: bigint;


}
