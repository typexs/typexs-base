import {Config} from "commons-config";
import {Container, Inject} from "typedi";
import {Invoker} from "../base/Invoker";
import {Tasks} from "../libs/tasks/Tasks";
import {Log} from '../libs/logging/Log'
import {Console} from '../libs/logging/Console'
import {TasksApi} from "../api/Tasks.api";
import {System} from "../libs/system/System";
import {TaskExecutionRequestFactory} from "../libs/tasks/worker/TaskExecutionRequestFactory";
import {TasksHelper} from "../libs/tasks/TasksHelper";
import * as _ from "lodash";
import {IError} from "../libs/exceptions/IError";

/**
 * Starts a task direct or in a running worker
 * Command: typexs task test [--targetId abc] [--mode worker|local]
 *
 * mode is per default 'worker' if one exists  else startup local
 *
 */
export class TaskCommand {

  @Inject(Tasks.NAME)
  tasks: Tasks;

  @Inject(Invoker.NAME)
  invoker: Invoker;

  @Inject(System.NAME)
  system: System;

  command: string = "task";

  aliases = "t";

  describe = "Start task";


  builder(yargs: any) {
    return yargs;
  }

  async handler(argv: any) {

    let targetId = Config.get('argv.targetId', null);
    let isLocal = Config.get('argv.local', false);

    // filter task names from request
    let taskNames: string[] = [];
    let start = false;
    let notask = false;
    for (let i = 0; i < process.argv.length; i++) {
      if (process.argv[i] == 'task') {
        start = true;
        continue;
      }
      if (!start) continue;
      if (process.argv[i].match(/^\-\-/)) {
        // parameter
        notask = true;
      } else {
        if (!notask) {
          taskNames.push(process.argv[i]);
        }
      }
    }

    if (taskNames.length > 0) {
      let args = Config.get('argv');
      // check nodes for tasks
      let tasks = this.tasks.getTasks(taskNames);

      if (!isLocal) {
        let tasksForWorkers = tasks.filter(t => t.hasWorker() && (targetId == null || (targetId && t.hasTargetNodeId(targetId))));

        if (tasks.length == tasksForWorkers.length) {
          // all tasks can be send to workers
          // execute

          Log.debug('task command: before request fire');
          let execReq = Container.get(TaskExecutionRequestFactory).createRequest();
          let results = await execReq.run(taskNames, args, targetId ? [targetId] : []);
          Log.debug('task command: event enqueue results', results);

        } else {
          // there are no worker running!
          Console.error('There are no worker running for tasks: ' + taskNames.join(', '));
        }
      } else if (isLocal) {

        if (taskNames.length == tasks.length) {
          let options: any = {
            parallel: 5,
            dry_mode: Config.get('argv.dry-mode', false)
          };

          // add parameters
          let parameters: any = {};
          _.keys(argv).map(k => {
            if (!/^_/.test(k)) {
              parameters[_.snakeCase(k)] = argv[k];
            }
          })

          // validate arguments
          let props = TasksHelper.getRequiredIncomings(taskNames.map(t => this.tasks.get(t)));
          if (props.length > 0) {
            for (let p of props) {
              if (!_.has(parameters, p.storingName) && !_.has(parameters, p.name)) {
                throw new Error('The required value is not passed');
              }
            }
          }

          let runner = TasksHelper.runner(this.tasks, taskNames, options);
          for (let p in parameters) {
            await runner.setIncoming(p, parameters[p]);
          }
          try {
            let results = await runner.run();
            Console.log(JSON.stringify(results));
          } catch (err) {
            Log.error(err);
          }
        } else {
          Console.error('There are no tasks: ' + taskNames.join(', '));
        }
      }

    } else {
      let res = this.tasks.names();
      Console.log('List of supported tasks:');
      Console.log('\t- ' + res.join('\n\t') + '\n');
    }


    await this.shutdown();
  }


  async shutdown() {
    await this.invoker.use(TasksApi).onShutdown();
  }
}
