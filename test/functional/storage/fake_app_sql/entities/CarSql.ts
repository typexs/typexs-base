import {Column, Entity, PrimaryGeneratedColumn, OneToMany} from 'typeorm';

import {DriverSql} from './DriverSql';

@Entity()
export class CarSql {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(type => DriverSql, car => car.car)
  driver: DriverSql[];
}
