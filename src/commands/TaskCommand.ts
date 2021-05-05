import {Config} from '@allgemein/config';
import {Inject} from 'typedi';
import {Invoker} from '../base/Invoker';
import {Tasks} from '../libs/tasks/Tasks';
import {Console} from '../libs/logging/Console';
import {TasksApi} from '../api/Tasks.api';
import {System} from '../libs/system/System';
import {TasksHelper} from '../libs/tasks/TasksHelper';
import {ICommand} from '../libs/commands/ICommand';
import {Log} from '../libs/logging/Log';


/**
 * Starts a task direct or in a running worker
 * Command: typexs task test [--targetId abc] [--outputMode worker|local]
 *
 * outputMode is per default 'worker' if one exists  else startup local
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
      try {
        const results = await TasksHelper.exec(taskNames, {
          isLocal: isLocal,
          remote: isRemote,
          targetId: targetId,
          skipTargetCheck: true,
          ...args
        });
        Console.log(JSON.stringify(results, null, 2));
      } catch (e) {
        Log.error(e);
      }

    } else {
      const res = this.tasks.names();
      Console.log('List of supported tasks:');
      Console.log('\t- ' + res.join('\n\t') + '\n');
    }
    await this.shutdown();
  }

  async init() {
    await this.invoker.use(TasksApi).onStartup();
  }

  async shutdown() {
    await this.invoker.use(TasksApi).onShutdown();
  }
}
