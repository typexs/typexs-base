export interface ITaskExecutionRequestOptions {
  /**
   * Ids of node where the task should be executed
   */
  targetIds: string[];

  /**
   * Ignore checking if worker node exists
   */
  skipTargetCheck: boolean;

}
