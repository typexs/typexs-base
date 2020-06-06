export interface ITaskRefOptions {
  /**
   * say that task is a grouping task
   */
  group?: boolean;

  /**
   * if task definition is remote only
   */
  remote?: boolean;

  /**
   * if worker for this node is online
   */
  worker?: boolean;

  [key: string]: any;
}
