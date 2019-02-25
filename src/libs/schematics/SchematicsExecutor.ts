import {DryRunEvent} from '@angular-devkit/schematics';
import {JsonObject, normalize, tags, terminal, virtualFs} from '@angular-devkit/core';
import {Log} from "../logging/Log";
import {ISchematicsOptions} from "./ISchematicsOptions";
import * as _ from 'lodash';
import {NodeJsSyncHost} from "@angular-devkit/core/node";
import {Logger} from "@angular-devkit/core/src/logger";
import {LogLevel} from "@angular-devkit/core/src/logger/logger";
import {FileWorkflow} from "./FileWorkflow";
import {Observable} from "rxjs";
import {of} from "rxjs/observable/of";
import {FileSystemHost} from "@angular-devkit/schematics/tools";


class WFLogger extends Logger {
  constructor() {
    super("WFLogger")
  }

  log(level: LogLevel, message: string, metadata?: JsonObject): void {
    Log.log(level, message, metadata);
  }

  debug(message: string, metadata?: JsonObject): void {
    this.log('debug', message);
  }

  info(message: string, metadata?: JsonObject): void {
    this.log('info', message);
  }

  warn(message: string, metadata?: JsonObject): void {
    this.log('warn', message);
  }

  error(message: string, metadata?: JsonObject): void {
    this.log('error', message);
  }

  fatal(message: string, metadata?: JsonObject): void {
    this.log('error', message);
  }
}


export class SchematicsExecutor {

  private _options: ISchematicsOptions;

  constructor(options: ISchematicsOptions) {

    this._options = options;
    if (!_.has(this._options, 'argv')) {
      this._options.argv = {}
    }

    if (!_.has(this._options, 'force')) {
      this._options.force = false;
    }

    if (!_.has(this._options, 'dry-run')) {
      this._options.dryRun = false;
    }

    if (!_.has(this._options, 'allowPrivate')) {
      this._options.allowPrivate = false;
    }

    if (!_.has(this._options, 'debug')) {
      this._options.debug = false;
    }
  }

  get basedir() {
    return this._options.basedir;
  }


  get workdir() {
    return this._options.workdir;
  }

  get collectionName() {
    return this._options.collectionName;
  }

  get schematicName() {
    return this._options.schematicName;
  }

  /**
   *  look at schematics cli $ angular_devkit/schematics_cli/bin/schematics.ts
   * @returns {Promise<void>}
   */
  async run() {
//
    this._options.argv.__BASEDIR__ = this.basedir;
    this._options.argv.__WORKDIR__ = this.workdir;

    // const engineHost = new FileSystemEngineHost({basedir: this.basedir});
    // const engine = new SchematicEngine(engineHost);
    //
    // // Add support for schemaJson.
    // const registry = new schema.CoreSchemaRegistry(formats.standardFormats);
    // engineHost.registerOptionsTransform(validateOptionsWithSchema(registry));
    // engineHost.registerTaskExecutor(BuiltinTaskExecutor.NodePackage);
    // engineHost.registerTaskExecutor(BuiltinTaskExecutor.RepositoryInitializer);

    //const collection = engine.createCollection(this.collectionName);
    //const schematic = collection.createSchematic(this.schematicName);

    const force = this._options.force;
    //const fsHost = new virtualFs.ScopedHost(new NodeJsSyncHost(), normalize(this.workdir));

    const fsHost = new FileSystemHost(this.workdir);
    // const host = observableOf(new FileSystemTree(fsHost));
    // let drySink = new DryRunSink(fsHost, this._options.force);
    // let fsSink = new HostSink(fsHost, this._options.force);

    let error: boolean = false;
    let nothingDone: boolean = true;
    let dryRun: boolean = this._options.dryRun;

    const workflow = new FileWorkflow(fsHost, {basedir: this.basedir, workdir: this.workdir, force, dryRun});

    let loggingQueue: string[] = [];

// Logs out dry run events.
    workflow.reporter.subscribe((event: DryRunEvent) => {
      nothingDone = false;

      switch (event.kind) {
        case 'error':
          const desc = event.description == 'alreadyExist' ? 'already exists' : 'does not exist.';
          Log.warn(`ERROR! ${event.path} ${desc}.`);
          error = true;
          break;
        case 'update':
          loggingQueue.push(tags.oneLine`
        ${terminal.white('UPDATE')} ${event.path} (${event.content.length} bytes)
      `);
          break;
        case 'create':
          loggingQueue.push(tags.oneLine`
        ${terminal.green('CREATE')} ${event.path} (${event.content.length} bytes)
      `);
          break;
        case 'delete':
          loggingQueue.push(`${terminal.yellow('DELETE')} ${event.path}`);
          break;
        case 'rename':
          loggingQueue.push(`${terminal.blue('RENAME')} ${event.path} => ${event.to}`);
          break;
      }
    });

    /*
        workflow.lifeCycle.subscribe(event => {
          if (event.kind == 'workflow-end' || event.kind == 'post-tasks-start') {
            if (!error) {
              // Flush the log queue and clean the error state.
              loggingQueue.forEach(log => Log.info(log));
            }

            loggingQueue = [];
            error = false;
          }
        });
    */
    // Pass the rest of the arguments as the smart default "argv". Then delete it.
    /*
    workflow.registry.addSmartDefaultProvider('argv', (schema: JsonObject) => {
      if ('index' in schema) {
        return this._options.argv._[Number(schema['index'])];
      } else {
        return this._options.argv._;
      }
    });
    */

    const debug = true;

    /**
     *  Execute the workflow, which will report the dry run events, run the tasks, and complete
     *  after all is done.
     *
     *  The Observable returned will properly cancel the workflow if unsubscribed, error out if ANY
     *  step of the workflow failed (sink or taskRef), with details included, and will only complete
     *  when everything is done.
     */

    await new Promise((resolve, reject) => {
      let exec = workflow.execute({
        collection: this.collectionName,
        schematic: this.schematicName,
        options: this._options.argv,
        allowPrivate: this._options.allowPrivate,
        debug: this._options.debug,
        logger: new WFLogger()
      });

      exec.subscribe({
        error(err: Error) {
          // In case the workflow was not successful, show an appropriate error message.
          // if (err instanceof UnsuccessfulWorkflowExecution) {
          // "See above" because we already printed the error.
          // Log.error('The Schematic workflow failed. See above.');
          //} else
          if (debug) {
            Log.error('An error occured:\n' + err.stack);
          } else {
            Log.error(err.message);
          }
          // reject(err);
          process.exit(1);
        },
        complete() {
          if (nothingDone) {
            Log.info('Nothing to be done.');
          } else {
            loggingQueue.forEach(log => Log.info(log));
          }
          resolve();
        },
      });
    });
  }
}
