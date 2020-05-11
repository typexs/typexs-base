/**
 * Base data necessary for task execution
 */
export interface ITaskExec {
  /**
   * how many task with same names can runn parallel
   */
  executionConcurrency?: number;

  /**
   * skip throw error when required parameter found
   */
  skipRequiredThrow?: boolean;

  /**
   * skip checking if target exists in network
   */
  skipTargetCheck?: boolean;

  /**
   * targetId mean the nodeId were the task must be executed
   */
  targetId?: string;

  /**
   * targetIds mean the nodeId's were the task must be executed
   */
  targetIds?: string[];

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
   * should task be executed remotely on a number of nodes
   */
  executeOnMultipleNodes?: number;

  /**
   * should task be executed remotely means all other nodes
   */
  randomRemoteNodeSelection?: boolean;

  /**
   * Timeout for worker request
   */
  timeout?: number;

  /**
   * Other values like parameters for the task
   */
  [k: string]: any;
}
