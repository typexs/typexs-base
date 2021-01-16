import * as _ from 'lodash';
import {ChildProcess, spawn} from 'child_process';

export class SpawnHandle {


  constructor(file: string, ...args: any[]) {
    this.file = file;
    this.args = _.isEmpty(args) ? [] : args;
  }

  file: string;

  args: any[] = [];

  process: ChildProcess;

  done: Promise<any>;

  started: Promise<any>;


  static do(file: string, ...args: any[]): SpawnHandle {
    return new SpawnHandle(file, ...args);
  }


  nodeId(nodeId: string) {
    this.args.push('--nodeId=' + nodeId);
    return this;
  }

  start(withLog: boolean = false): SpawnHandle {
    if (withLog) {
      this.args.push('--enable_log');
    }

    this.process = spawn(process.execPath,
      ['--require', 'ts-node/register', this.file]
        .concat(this.args), {stdio: ['pipe', 'pipe', 'pipe', 'ipc']});

    if (withLog || true) {
      this.withLog();
    }

    this.done = new Promise(resolve => {
      this.process.on('exit', resolve);
    });

    this.started = new Promise(resolve => {
      this.process.on('message', d => {
        if (d === 'startup') {
          resolve(null);
        }
      });
      this.process.stderr.on('data', d => {
        const x = d.toString().trim();
        if (/startup finished/.test(x)) {
          resolve(null);
        }
      });
      this.process.stdout.on('data', d => {
        const x = d.toString().trim();
        if (/startup finished/.test(x)) {
          resolve(null);
        }
      });
    });
    return this;
  }


  withLog() {
    this.process.stdout.on('data', d => {
      console.log('out=> ' + d.toString().trim());
    });
    this.process.stderr.on('data', d => {
      console.error('err=> ' + d.toString().trim());
    });
    return this;
  }


  exit() {
    this.process.kill();
  }


  shutdown() {
    this.process.send('shutdown');
  }
}
