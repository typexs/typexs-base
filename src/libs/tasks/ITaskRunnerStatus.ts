import {TASK_STATES} from './Constants';

export interface ITaskRunnerStatus {

  /**
   * Runner id
   */
  id: string;

  /**
   * Node id of runner
   */
  nodeId: string;

  /**
   * Intern task runner number
   */
  nr?: number;

  /**
   * Runner states
   */
  state?: TASK_STATES;

  /**
   * all task names
   */
  taskNames: string[];

  /**
   * running tasknames
   */
  running?: string[];

  /**
   * running tasknames
   */
  finished?: string[];

  /**
   * started
   */
  started?: Date;

  /**
   * stopped
   */
  stopped?: Date;
}
