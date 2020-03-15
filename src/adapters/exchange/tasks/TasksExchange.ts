import {AbstractExchange} from '../../../libs/messaging/AbstractExchange';
import {TasksRequest} from './TasksRequest';
import {TasksResponse} from './TasksResponse';
import {TasksHelper} from '../../../libs/tasks/TasksHelper';
import {NotYetImplementedError, PlatformUtils} from 'commons-base';
import {TaskRunnerRegistry} from '../../../libs/tasks/TaskRunnerRegistry';
import {Inject} from 'typedi';
import {IMessageOptions} from '../../../libs/messaging/IMessageOptions';


export class TasksExchange extends AbstractExchange<TasksRequest, TasksResponse> {

  @Inject(TaskRunnerRegistry.NAME)
  runnerRegistry: TaskRunnerRegistry;

  constructor() {
    super(TasksRequest, TasksResponse);
  }

  /**
   * Get log file path to fetch file content over FileSystemHandle
   *
   * @param runnerId
   * @param opts
   */
  getLogFilePath(runnerId: string, opts: IMessageOptions = {}) {
    const req = new TasksRequest();
    req.op = 'logfile';
    req.runnerId = runnerId;
    const msg = this.create(opts);
    return msg.run(req);
  }


  /**
   * Get current running runners
   *
   * @param opts
   */
  getRunners(opts: IMessageOptions = {}) {
    const req = new TasksRequest();
    req.op = 'runners';
    const msg = this.create(opts);
    return msg.run(req);
  }

  /**
   * TODO start a task
   *
   * @param opts
   */
  start() {}

  /**
   * TODO stop a task
   *
   * @param opts
   */
  stop() {}

  /**
   * TODO pause a task (if possible)
   *
   * @param opts
   */
  pause() {}

  /**
   * TODO resume a task (if possible)
   *
   * @param opts
   */
  resume() {}

  async handleRequest(request: TasksRequest, response: TasksResponse) {
    response.op = request.op;
    try {
      // todo get current running tasks
      switch (request.op) {
        case 'logfile':
          // get log path
          const logFilePath = TasksHelper.getTaskLogFile(request.runnerId, this.getSystem().node.nodeId);
          if (PlatformUtils.fileExist(logFilePath)) {
            response.logFilePath = logFilePath;
          } else {
            throw new Error(`file for runner ${request.runnerId} not found`);
          }
          break;
        case 'runners':
          const runners = this.runnerRegistry.getRunners();
          response.stats = runners.map(x => x.collectStats());
          break;

        case 'start':
          throw  new NotYetImplementedError();

        case 'stop':
          throw  new NotYetImplementedError();

        default:
          throw  new NotYetImplementedError();

      }
    } catch (e) {
      this.logger.error(e);
      response.error = e;
    }
  }


  handleResponse(responses: TasksResponse) {
    switch (responses.op) {
      case 'logfile':
        return responses.logFilePath;
      case 'runners':
        return responses.stats;
      default:
        throw new NotYetImplementedError();
    }
  }
}


