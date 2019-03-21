import * as _ from "lodash";
import {
  AfterInsert,
  AfterUpdate,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn
} from "typeorm";


@Entity()
export class TaskLog {

  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  tasksId: string;

  @Index()
  @Column()
  taskName: string;

  @Index()
  @Column()
  taskNr: number;

  @Column({nullable: true})
  started: Date;

  @Column({nullable: true})
  finished: Date;

  @Column({nullable: true})
  duration: number;

  @Column({nullable: true})
  data: string;


  @BeforeInsert()
  bi() {
    if (this.data) {
      this.data = JSON.stringify(this.data);
    }
  }


  @BeforeUpdate()
  bu() {
    if (this.data) {
      this.data = JSON.stringify(this.data);
    }
  }


  @AfterInsert()
  ai() {
    if (_.isString(this.data)) {
      this.data = JSON.parse(this.data);
    }
  }


  @AfterUpdate()
  au() {
    if (_.isString(this.data)) {
      this.data = JSON.parse(this.data);
    }
  }
}
