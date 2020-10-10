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

  /**
   * Instance number for multiple instance of same nodeId
   */
  @IsNotEmpty()
  @Index()
  @Column()
  instNr: number = 0;

  @Column({nullable: true})
  isBackend: boolean;

  @Column()
  state: string; // 'startup' | 'offline' | 'register' | 'unregister' | 'idle' | 'active';

  @Column({nullable: true})
  started_at: Date = new Date();

  @Column({nullable: true})
  updated_at: Date;

  @Column({nullable: true})
  finished: Date;

  contexts: INodeInfo[] = [];

  active: boolean = false;




  getRuntime() {
    return (new Date().getTime()) - this.started_at.getTime();
  }

  restore() {
    if (_.isString(this.started_at)) {
      this.started_at = new Date(this.started_at);
    }
    if (_.isString(this.updated_at)) {
      this.updated_at = new Date(this.updated_at);
    }
  }

  eqNode(x: { nodeId: string, instNr: number }) {
    return this.nodeId === x.nodeId && x.instNr === this.instNr;
  }


}
