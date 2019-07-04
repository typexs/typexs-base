import * as _ from 'lodash';
import {Column, Entity, Index, PrimaryColumn} from 'typeorm';
import {INodeInfo} from '../libs/system/INodeInfo';
import {IsNotEmpty} from 'class-validator';


@Entity()
export class SystemNodeInfo {

  /**
   * Combined key of hostname and nodeId
   */
  @PrimaryColumn()
  key: string;

  @IsNotEmpty()
  @Index()
  @Column()
  machineId: string;

  @IsNotEmpty()
  @Index()
  @Column()
  hostname: string;

  @IsNotEmpty()
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
