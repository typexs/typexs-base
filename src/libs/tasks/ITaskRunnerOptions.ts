/**
 * Configuration options for a task runner
 */
export interface ITaskRunnerOptions {
  /**
   * Override for task runner id
   */
  id?: string;

  /**
   * NodeId of task execution caller
   */
  nodeId: string;

  /**
   * Target IDs (NodeId's were task should be executed)
   */
  targetIds: string[];

  /**
   * Is a local execution
   */
  local: boolean;
}
