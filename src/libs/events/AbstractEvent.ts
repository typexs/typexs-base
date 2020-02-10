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
   * Id of responding system node
   */
  respId: string;


  constructor() {
    this.id = CryptUtils.shorthash('event-' + (new Date()).getTime() + '' + (AbstractEvent.inc++));
  }

}
