/**
 * A watcher base config
 */
export interface AbstractWatcherConfig {
  /**
   * Type of the watcher
   */
  type: string;
  /**
   * Name of the watcher
   */
  name: string;
  /**
   * Event to emit when the watcher triggers
   */
  event?: string;
  /**
   * List of tasks to execute when the watcher triggers
   */
  task?: {
    /**
     * List of task names
     */
    names: string[];
    /**
     * Params to pass to the tasks
     */
    params?: any;
  }
}
