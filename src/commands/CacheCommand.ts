import * as _ from 'lodash';
import {ICommand} from '../libs/commands/ICommand';
import {Log} from '../libs/logging/Log';
import {Inject} from 'typedi';
import {Cache} from '../libs/cache/Cache';
import {System} from '../libs/system/System';

export class CacheCommand implements ICommand {


  command = 'cache [command] [bin]';

  aliases = 'cache';

  describe = 'Clear cache bins';

  @Inject(Cache.NAME)
  cache: Cache;


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
    if (argv.command === 'clear') {
      const bins = this.cache.getBins();
      if (argv.bin) {
        if (bins[argv.bin]) {
          console.log('clear bin ' + argv.bin);
          await bins[argv.bin].store.clearBin(argv.bin);
        } else {
          console.log('cache bin with name ' + argv.bin + ' not found.');
        }
      } else {
        for (const k of _.keys(bins)) {
          console.log('clear bin ' + k);
          await bins[k].store.clearBin(k);
        }
      }
    } else if (argv.command === 'bins') {
      const bins = this.cache.getBins();
      console.log('Active bins:');
      for (const k of _.keys(bins)) {
        console.log('\t- ' + k);
        await bins[k].store.clearBin(k);
      }
    } else {
      console.log('no sub command found. Example: cache clear or cache clear someBin');
    }
  }
}

