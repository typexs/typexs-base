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
  started: Date = new Date();

  @Column({nullable: true})
  finished: Date;

  contexts: INodeInfo[] = [];

  active: boolean = false;


  getRuntime() {
    return (new Date().getTime()) - this.started.getTime();
  }

  restore() {
    if (_.isString(this.started)) {
      this.started = new Date(this.started);
    }
  }

  eqNode(x: { nodeId: string, instNr: number }) {
    return this.nodeId === x.nodeId && x.instNr === this.instNr;
  }


}
