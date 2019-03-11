export interface ITaskRefOptions {
  /**
   * say that task is a grouping task
   */
  group?: boolean;

  /**
   * if task definition is remote only
   */
  remote?: boolean;

  [key: string]: any;
}
