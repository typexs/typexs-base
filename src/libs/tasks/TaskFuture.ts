/**
 * TODO: Future object which waits till a task is done
 */
import {EventEmitter} from 'events';
import {subscribe} from 'commons-eventbus/browser';
import {TaskEvent} from './worker/TaskEvent';

export class TaskFuture extends EventEmitter {

  constructor(condition: any) {
    super();
  }

  @subscribe(TaskEvent)
  onTask(event: TaskEvent) {
    if (event.topic === 'data' && ['stopped', 'errored', 'request_error'].includes(event.state)) {
      // console.log(inspect(event, false, 10));
      // if (event.state === 'stopped') {
      //   this.queue.emit('job_done_' + event.id, event, null);
      // } else {
      //   this.queue.emit('job_done_' + event.id, event, event.errors);
      // }
    }
  }

}
