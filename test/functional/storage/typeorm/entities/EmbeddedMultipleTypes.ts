import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';
import {MultipleTypes} from './MultipleTypes';

@Entity()
export class EmbeddedMultipleTypes {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  object: MultipleTypes;

  @Column(type => MultipleTypes)
  objects: MultipleTypes[];

}
