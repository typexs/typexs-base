export interface ITaskExecutionRequestOptions {
  /**
   * Timeout
   */
  timeout?: number;

  /**
   * Ids of node where the task should be executed
   */
  targetIds: string[];

  /**
   * Ignore checking if worker node exists
   */
  skipTargetCheck: boolean;

  /**
   * Process on task event state
   */
  passingTaskState?: string;

}
