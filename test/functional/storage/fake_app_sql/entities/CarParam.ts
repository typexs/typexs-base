import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class CarParam {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  year: number;

  @Column()
  doors: number;

  @Column()
  maxSpeed: number;

  @Column()
  ps: number;

  @Column()
  production: Date;


}
