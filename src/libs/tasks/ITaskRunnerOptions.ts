/**
 * Configuration options for a task runner
 */
export interface ITaskRunnerOptions {
  /**
   * Override for task runner id
   */
  id?: string;

  /**
   * NodeId of task execution runner
   */
  nodeId?: string;

  /**
   * NodeId of task execution caller
   */
  callerId?: string;

  /**
   * Target IDs (NodeId's were task should be executed)
   */
  targetIds?: string[];

  /**
   * Is a local execution
   */
  local?: boolean;

  /**
   * skip throw error when required parameter found
   */
  skipRequiredThrow?: boolean;

  /**
   * Number of parallel starting tasks if dependencies exist.
   */
  parallel?: number;

  /**
   * DEPRECATED, for testing reasons allows running in test mode
   */
  dryMode?: boolean;


  /**
   * Ignore add to task runner registry, cause maybe already appended
   */
  skipRegistryAddition?: boolean;


  /**
   * Ignore creation of task logfile
   */
  disableLogFile?: boolean;
}
