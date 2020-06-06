/**
 * Contains the context on which node the task can be runned and if the is a worker active for the task
 */
export interface ITaskRefNodeInfo {
  /**
   * Node id where the task is registered
   */
  nodeId: string;
  /**
   * Mark that the task worker active
   */
  hasWorker: boolean;
}
