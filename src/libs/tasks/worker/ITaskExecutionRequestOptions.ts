export interface ITaskExecutionRequestOptions {
  /**
   * Timeout
   */
  timeout?: number;

  /**
   * Ids of node where the task should be executed
   */
  targetIds?: string[];

  /**
   * Ignore checking if worker node exists
   */
  skipTargetCheck?: boolean;

  /**
   * Process on task event state
   */
  passingTaskState?: string;

  /**
   * random worker node selection
   */
  randomWorkerSelection?: boolean;

  /**
   * should task be executed remotely on a number of nodes
   */
  executeOnMultipleNodes?: number;

}
