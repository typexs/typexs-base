import {UseAPI} from '../decorators/UseAPI';
import {TasksApi} from '../api/Tasks.api';
import {ITasksApi} from '../api/ITasksApi';
import {TaskRunner} from '../libs/tasks/TaskRunner';
import {TaskRun} from '../libs/tasks/TaskRun';
import * as winston from 'winston';
import {DefaultJsonFormat} from '../libs/logging/DefaultJsonFormat';
import {TasksHelper} from '../libs/tasks/TasksHelper';
import {StreamLogger} from '../libs/logging/StreamLogger';
import {Log} from '../libs/logging/Log';
import {WinstonLoggerJar} from '../libs/logging/WinstonLoggerJar';
import {ILogEntry} from '../libs/logging/ILogEntry';


@UseAPI(TasksApi)
export class WinstonTaskLoggingExtension implements ITasksApi {


  onInit(runner: TaskRunner | TaskRun) {
    if (runner instanceof TaskRunner) {
      const logger = runner.getLogger();
      if (logger instanceof StreamLogger) {

        const name = logger.name;
        const options = logger.getOptions() as any;
        const newLogger = Log._().createLogger(name,
          {
            taskStart: options.taskStart,
            taskId: options.taskId,
            taskNames: options.taskNames,
          },
          {
            enable: true,
            prefix: name,
            force: true
          }
        ) as WinstonLoggerJar;

        // newLogger.logger().add(
        //   new winston.transports.Stream({
        //     stream: runner.getWriteStream(),
        //     format: new DefaultJsonFormat()
        //   }));

        if (!runner.$options.disableLogFile) {
          const filename = TasksHelper.getTaskLogFile(runner.getId(), runner.getOptions().nodeId);
          newLogger.logger().add(
            new winston.transports.File({
              filename: filename,
              format: new DefaultJsonFormat()
            }));
        }

        runner.getReadStream().on('data', chunk => {
          try {
            const entry = JSON.parse(chunk) as ILogEntry;
            newLogger.log(entry.level as string, entry);
          } catch (e) {
            newLogger.error(e);
          }
        });
        runner.getReadStream().on('close', () => {
          Log._().removeLogger(name);
        });

      }

    }
  }


}
