/**
 * used for typexs config unter key: 'tasks'
 * -
 */

export interface IWorkerAccess {
  /**
   * can be task name or minimatch pattern
   */
  name: string;

  /**
   * define allow or deny for given name or pattern
   */
  access: 'allow' | 'deny';

  /**
   * generate minimatch
   */
  match?: any;
}

export interface IWorkerConfig {

  /**
   * deny or allow tasks for current runtime
   *
   * for example:
   *
   * - you can deny all workers with
   *   {task:*, access:'deny'}
   *
   * - and then allow only one worker
   *   {task:'MyWorkerClassName', access:'allow'}
   */
  access: IWorkerAccess[];


  config?: { [name: string]: any };
}
