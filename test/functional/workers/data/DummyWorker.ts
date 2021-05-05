import {IWorker, Log} from '../../../../src';
import {IWorkerStatisitic} from '../../../../src/libs/worker/IWorkerStatisitic';


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
