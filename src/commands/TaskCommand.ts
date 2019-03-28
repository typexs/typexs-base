import {Config} from "commons-config";
import {Container, Inject} from "typedi";
import {Invoker} from "../base/Invoker";
import {Tasks} from "../libs/tasks/Tasks";
import {Log} from '../libs/logging/Log'
import {Console} from '../libs/logging/Console'
import {TasksApi} from "../api/Tasks.api";
import {System} from "../libs/system/System";
import {TaskExecutionRequest} from "../libs/tasks/worker/TaskExecutionRequest";
import {TaskExecutionRequestFactory} from "../libs/tasks/worker/TaskExecutionRequestFactory";

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

          /*
          let event = new TaskEvent();
          if (targetId) {
            if (!event.targetIds) event.targetIds = [];
            event.targetIds.push(targetId);
          }
          event.name = taskNames;
          for (let k of _.keys(args)) {
            if (!/^_/.test(k)) {
              console.log(k);
              event.addParameter(k, args[k]);
            }
          }
          event.nodeId = this.system.node.nodeId;
          Log.debug('Sending event', event);
          await EventBus.post(event);
*/
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

          let runner = this.tasks.runner(taskNames, options);
          await new Promise((resolve, reject) => {
            runner.run(async (results: any) => {
              Console.log(JSON.stringify(results));
              resolve()
            });
          })
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
