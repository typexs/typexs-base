import {System} from '../../system/System';
import {Inject} from 'typedi';
import {TaskExecutionRequest} from './TaskExecutionRequest';
import {Tasks} from '../Tasks';
import {TaskExecutionExchange} from './execute/TaskExecutionExchange';


export class TaskRequestFactory {

  @Inject(System.NAME)
  private system: System;

  @Inject(Tasks.NAME)
  private tasks: Tasks;

  /**
   * @Deprecated
   */
  // createRequest() {
  //   return new TaskExecutionRequest(this.system, this.tasks);
  // }

  executeRequest() {
    return new TaskExecutionExchange(this.system, this.tasks);
  }
}
