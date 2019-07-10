import {Config} from 'commons-config';
import {Inject} from 'typedi';
import {Invoker} from '../base/Invoker';
import {Tasks} from '../libs/tasks/Tasks';
import {Console} from '../libs/logging/Console';
import {TasksApi} from '../api/Tasks.api';
import {System} from '../libs/system/System';
import {TasksHelper} from '../libs/tasks/TasksHelper';
import {ICommand} from '..';


/**
 * Starts a task direct or in a running worker
 * Command: typexs task test [--targetId abc] [--mode worker|local]
 *
 * mode is per default 'worker' if one exists  else startup local
 *
 */
export class TaskCommand implements ICommand {

  @Inject(Tasks.NAME)
  tasks: Tasks;

  @Inject(Invoker.NAME)
  invoker: Invoker;

  @Inject(System.NAME)
  system: System;

  command = 'task';

  aliases = 't';

  describe = 'Start task';


  beforeStartup(): void {
    System.enableDistribution(false);
  }


  builder(yargs: any) {
    return yargs;
  }

  async handler(argv: any) {

    const targetId = Config.get('argv.targetId', null);
    let isLocal = true; // Config.get('argv.local', false);
    const isRemote = Config.get('argv.remote', false);

    if (targetId === null && !isRemote) {
      isLocal = true;
      // wait moment for

    } else {
      isLocal = false;
    }

    // filter task names from request
    const taskNames: string[] = [];
    let start = false;
    let notask = false;

    for (let i = 0; i < process.argv.length; i++) {
      if (process.argv[i] === 'task') {
        start = true;
        continue;
      }
      if (!start) {
        continue;
      }
      if (process.argv[i].match(/^\-\-/)) {
        // parameter
        notask = true;
      } else {
        if (!notask) {
          taskNames.push(process.argv[i]);
        }
      }
    }


    await this.init();

    if (taskNames.length > 0) {
      const args = Config.get('argv');

      const results = await TasksHelper.exec(taskNames, {
        isLocal: isLocal,
        remote: isRemote,
        targetId: targetId,
        ...args
      });

      Console.log(JSON.stringify(results, null, 2));
      /*
            // check nodes for tasks
            let tasks = this.tasks.getTasks(taskNames);

            if (!isLocal) {
              let tasksForWorkers = tasks.filter(t => t.hasWorker() && (targetId === null || (targetId && t.hasTargetNodeId(targetId))));

              if (tasks.length === tasksForWorkers.length) {
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

              if (taskNames.length === tasks.length) {
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
                });

                // validate arguments
                let props = TasksHelper.getRequiredIncomings(taskNames.map(t => this.tasks.get(t)));
                if (props.length > 0) {
                  for (let p of props) {
                    if (!_.has(parameters, p.storingName) && !_.has(parameters, p.name)) {
                      if (p.isOptional()) {
                        Log.warn('task command: optional parameter "' + p.name + '" for ' + taskNames.join(', ') + ' not found')
                      } else {
                        throw new Error('The required value is not passed');
                      }
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
      */
    } else {
      const res = this.tasks.names();
      Console.log('List of supported tasks:');
      Console.log('\t- ' + res.join('\n\t') + '\n');
    }

    await this.shutdown();
  }

  async init() {
    await this.invoker.use(TasksApi).onInit();
  }

  async shutdown() {

    await this.invoker.use(TasksApi).onShutdown();
  }
}
