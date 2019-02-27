import {IQueueWorkload} from "../..";

export interface ITaskWorkload extends IQueueWorkload {

  /**
   * Name or names of the taskRef's to run
   */
  name: string | string[];

  /**
   * Arguments for task execution
   */
  parameters?: any;


}
