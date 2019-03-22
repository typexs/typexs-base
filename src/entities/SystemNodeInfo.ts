import * as _ from "lodash";
import {
  AfterInsert,
  AfterUpdate,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index, PrimaryColumn,
  PrimaryGeneratedColumn
} from "typeorm";
import {INodeInfo} from "../libs/system/INodeInfo";


@Entity()
export class SystemNodeInfo {

  /**
   * Combined key of hostname and nodeId
   */
  @PrimaryColumn()
  key: string;

  @Index()
  @Column()
  hostname: string;

  @Index()
  @Column()
  nodeId: string;

  @Column({nullable: true})
  isBackend: boolean;

  @Column()
  state: string;

  @Column({nullable: true})
  started: Date = new Date();

  @Column({nullable: true})
  finished: Date;

  contexts: INodeInfo[] = [];


  getRuntime() {
    return (new Date().getTime()) - this.started.getTime();
  }

  restore() {
    if (_.isString(this.started)) {
      this.started = new Date(this.started);
    }
  }


}
