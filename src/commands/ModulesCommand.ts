import {Config} from '@allgemein/config';
import {Bootstrap} from '../Bootstrap';
import {ICommand} from '../libs/commands/ICommand';
import {IModule} from '../api/IModule';

import {inspect} from 'util';
import {System} from '../libs/system/System';

export class ModulesCommand implements ICommand {

  command = 'modules';
  aliases = 'm';
  describe = 'List modules';

  builder(yargs: any) {
    return yargs;
  }


  beforeStartup(): void {
    System.enableDistribution(false);
  }

  async handler(argv: any) {

    const modules: IModule[] = Bootstrap._().getModules();

    if (Config.get('argv.json', false)) {
      console.log(inspect(modules, false, 10));
    } else {
      for (const modul of modules) {
        console.log('- Modul: ' + modul.name + ' ' + modul.version + ' (internal: ' + modul.internal + ')');
      }

    }
  }
}

