/**
 * used for typexs config unter key: 'tasks'
 * -
 */

export interface ITaskAccess {
  /**
   * can be task name or minimatch pattern
   */
  task: string;

  /**
   * define allow or deny for given name or pattern
   */
  access: 'allow' | 'deny'

  /**
   * generate minimatch
   */
  match?: any;
}

export interface ITasksConfig {

  /**
   * Id on node
   */
  nodeId?: string;


  /**
   * deny or allow tasks for current runtime
   *
   * for example:
   *
   * - you can deny all tasks with
   *   {task:*, access:'deny'}
   *
   * - and then allow only one task
   *   {task:'my_allowed_task', access:'allow'}
   */
  access: ITaskAccess[]

}
