import {Tasks} from '../../..';
import {System} from '../../system/System';
import {Inject} from 'typedi';
import {TaskExecutionRequest} from './TaskExecutionRequest';


export class TaskExecutionRequestFactory {

  @Inject(System.NAME)
  private system: System;

  @Inject(Tasks.NAME)
  private tasks: Tasks;


  createRequest() {
    return new TaskExecutionRequest(this.system, this.tasks);
  }
}
