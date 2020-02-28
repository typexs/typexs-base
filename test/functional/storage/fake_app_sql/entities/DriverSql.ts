import {Column, Entity, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn} from 'typeorm';
import {CarSql} from './CarSql';

@Entity()
export class DriverSql {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @ManyToOne(type => CarSql, user => user.driver)
  car: CarSql;
}
