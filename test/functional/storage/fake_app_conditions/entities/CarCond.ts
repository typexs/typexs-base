import {Column, Entity, PrimaryGeneratedColumn, OneToMany} from 'typeorm';

import {DriverCond} from './DriverCond';

@Entity()
export class CarCond {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(type => DriverCond, car => car.car)
  driver: DriverCond[];
}
