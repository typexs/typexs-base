import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from 'typeorm';
import {DriverCondMango} from './DriverCondMango';

@Entity()
export class CarCondMango {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(type => DriverCondMango, car => car.car)
  driver: DriverCondMango[];
}
