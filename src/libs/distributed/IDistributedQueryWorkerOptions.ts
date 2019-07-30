import {IAsyncQueueOptions} from '../queue/IAsyncQueueOptions';

export interface IDistributedQueryWorkerOptions extends IAsyncQueueOptions {

  /**
   * Define which nodes can execute requests on which nodes, if empty all are allowed
   *
   * allowed:
   *   node01: *
   *   node02:
   *   - OnlySpecialType
   */
  allowed?: { [nodeId: string]: string | string[] };

  /**
   * Allow send request on own node worker
   */
  onlyRemote?: boolean;
}
