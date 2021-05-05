import * as _ from 'lodash';
import {Column, Entity, Index, PrimaryColumn} from 'typeorm';
import {INodeInfo} from '../libs/system/INodeInfo';
import {IsNotEmpty} from '@allgemein/schema-api/decorators/validate/IsNotEmpty';
import {Required} from '@allgemein/schema-api';


@Entity()
export class SystemNodeInfo {

  /**
   * Combined key of hostname and nodeId
   */
  @PrimaryColumn()
  key: string;

  @Required()
  @Index()
  @Column()
  machineId: string;

  @Required()
  @Index()
  @Column()
  hostname: string;

  @Required()
  @Index()
  @Column()
  nodeId: string;

  /**
   * Instance number for multiple instance of same nodeId
   */
  @Required()
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
