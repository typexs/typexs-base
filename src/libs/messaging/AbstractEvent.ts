import {CryptUtils} from 'commons-base/browser';


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
  error: Error;

  constructor() {
    this.id = CryptUtils.shorthash('event-' + (new Date()).getTime() + '' + (AbstractEvent.inc++));
  }

}
