import {Config} from '@allgemein/config';
import {ICommand} from '../libs/commands/ICommand';
import {System} from '../libs/system/System';
import {Log} from '../libs/logging/Log';

/**
 * config commands ist called by "config"
 */
export class ConfigCommand implements ICommand {


  command = 'config [key]';

  aliases = 'c';

  describe = 'Show config or config element';


  builder(yargs: any) {
    return yargs;
  }


  beforeStartup(): void {
    System.enableDistribution(false);
  }

  beforeStorage(): void {
    Log.options({enable: false, loggers: [{name: '*', enable: false}]}, false);
  }


  async handler(argv: any) {
    if (argv.key) {
      console.log(JSON.stringify(Config.get(argv.key), null, 2));
    } else {
      console.log(JSON.stringify(Config.all(), null, 2));
    }
  }
}

