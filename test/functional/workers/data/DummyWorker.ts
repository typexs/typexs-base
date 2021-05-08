import {IWorkerStatisitic} from '../../../../src/libs/worker/IWorkerStatisitic';
import {IWorker} from '../../../../src/libs/worker/IWorker';
import {Log} from '../../../../src/libs/logging/Log';


export class DummyWorker implements IWorker {

  static NAME = 'DummyWorker';

  name = 'dummy_worker';

  inc = 0;

  nodeId: string;


  async prepare(options: any) {
    Log.info('dummy onStartup');
  }


  statistic(): IWorkerStatisitic {
    return {} as any;
  }

  async finish() {
    Log.info('finish worker');
  }
}
