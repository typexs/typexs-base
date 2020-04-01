import {Column, Entity, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {CarCondMango} from './CarCondMango';

@Entity()
export class DriverCondMango {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @ManyToOne(type => CarCondMango, user => user.driver)
  car: CarCondMango;
}
