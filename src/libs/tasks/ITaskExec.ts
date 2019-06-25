/**
 * Base data necessary for task execution
 */
export interface ITaskExec {

  /**
   * targetId mean the nodeId were the task must be executed
   */
  targetId?: string;

  /**
   * should task be executed locally, means on node calling the task
   */
  isLocal?: boolean;


  /**
   * should task be executed remotely means all other nodes
   */
  remote?: boolean;

  /**
   * Other values like parameters for the task
   */
  [k: string]: any;
}
