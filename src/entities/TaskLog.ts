import * as _ from 'lodash';
import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn
} from 'typeorm';


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
  @Column({nullable: true})
  taskNr: number;

  @Index()
  @Column()
  state: string;

  @Index()
  @Column({nullable: true})
  callerId: string;

  @Index()
  @Column()
  nodeId: string;

  @Index()
  @Column({nullable: true})
  respId: string;

  @Index()
  @Column({nullable: true})
  hasError: boolean;

  @Column({nullable: true})
  progress: number;

  @Column({nullable: true})
  total: number;

  @Column({nullable: true})
  done: boolean;

  @Column({nullable: true})
  running: boolean;

  @Column({nullable: true})
  weight: number;

  @Column({nullable: true})
  created: Date;

  @Column({nullable: true})
  started: Date;

  @Column({nullable: true})
  stopped: Date;

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


  @AfterLoad()
  al() {
    if (_.isString(this.data)) {
      this.data = JSON.parse(this.data);
    }
  }
}
