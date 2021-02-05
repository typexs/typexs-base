import {CryptUtils} from '@allgemein/base';


export abstract class AbstractEvent {


  static inc = 0;

  /**
   * creation date of this task
   */
  created: Date = new Date();

  /**
   * Id of event itself
   */
  id: string;

  /**
   * For multiparted messages
   */
  seqNr: number = 0;


  /**
   * Id of system node which created the event
   */
  nodeId: string;

  /**
   * Nr of nodeId instance if multiple are running
   */
  instNr: number;


  /**
   * Id of target system node
   *
   * Used for direct task allocation
   */
  targetIds: string[];

  /**
   * Id of requesting event id node
   */
  reqEventId: string;

  /**
   * Id of responding system node
   */
  respId: string;

  /**
   * Error
   */
  error: Error | { message: string, name: string };

  /**
   * response exists but shouldn't be ad to results
   */
  skipping: boolean = false;


  constructor() {
    this.id = CryptUtils.shorthash('event-' + (new Date()).getTime() + '' + (AbstractEvent.inc++));
  }

  of(system: { nodeId: string, instNr: number }) {
    this.nodeId = system.nodeId;
    this.instNr = system.instNr;
  }

}
