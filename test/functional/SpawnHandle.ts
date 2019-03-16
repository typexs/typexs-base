import * as _ from 'lodash';
import {ChildProcess, spawn} from "child_process";

export class SpawnHandle {

  file: string;

  args: any[] = [];

  process: ChildProcess;

  done: Promise<any>;
  started: Promise<any>;

  constructor(file: string, ...args: any[]) {
    this.file = file;
    this.args = _.isEmpty(args) ? [] : args;
  }

  start(withLog: boolean = false): SpawnHandle {
    this.process = spawn(process.execPath, ['--require', 'ts-node/register', this.file].concat(this.args));
    if (withLog) {
      this.withLog();
    }
    this.done = new Promise(resolve => {
      this.process.on('exit', resolve);
    });

    this.started = new Promise(resolve => {
      this.process.stderr.on("data", d => {
        let x = d.toString().trim();
        if (/startup finished/.test(x)) {
          resolve();
        }
      });
    });
    return this;
  }

  withLog() {
    this.process.stdout.on("data", d => {
      console.log(d.toString().trim());
    });
    this.process.stderr.on("data", d => {
      console.error(d.toString().trim());
    });
    return this;
  }

  static do(file: string, ...args: any[]): SpawnHandle {
    return new SpawnHandle(file, ...args);
  }
}