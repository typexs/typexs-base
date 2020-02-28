import {Column, Entity, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {CarCond} from './CarCond';

@Entity()
export class DriverCond {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @ManyToOne(type => CarCond, user => user.driver)
  car: CarCond;
}
