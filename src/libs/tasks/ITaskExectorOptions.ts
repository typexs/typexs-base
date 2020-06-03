/**
 * Base data necessary for task execution
 */
import {ITaskExecutionRequestOptions} from './worker/ITaskExecutionRequestOptions';

export interface ITaskExectorOptions extends ITaskExecutionRequestOptions {
  /**
   * how many task with same names can run parallel on a node
   */
  executionConcurrency?: number;

  /**
   * skip throw error when required parameter found
   */
  skipRequiredThrow?: boolean;

  /**
   * skip generic throwing
   */
  skipThrow?: boolean;

  /**
   * targetId mean the nodeId were the task must be executed
   */
  targetId?: string;

  /**
   * should task be executed locally, means on node calling the task
   */
  isLocal?: boolean;


  /**
   * Enable remote task listener
   */
  waitForRemoteResults?: boolean;


  /**
   * should task be executed remotely means all other nodes
   */
  remote?: boolean;



  /**
   * Other values like parameters for the task
   */
  [k: string]: any;
}
