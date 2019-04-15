export interface ITaskRunnerOptions {
  /**
   * Override for task runner id
   */
  id?:string;
  nodeId: string;
  targetIds: string[];
}
