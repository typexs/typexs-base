import {concat, concatMap, ignoreElements, map} from "rxjs/operators";
import {FileSystemEngineHost} from "./FileSystemEngineHost";
import {of as observableOf} from 'rxjs/observable/of';

import {
  DryRunEvent,
  DryRunSink,
  FileSystemTree,
  formats, HostSink,
  SchematicEngine,
  Tree,
} from '@angular-devkit/schematics';
import {BuiltinTaskExecutor} from '@angular-devkit/schematics/tasks/node';
import {FileSystemHost, validateOptionsWithSchema,} from '@angular-devkit/schematics/tools';
import {schema, tags, terminal,virtualFs,normalize} from '@angular-devkit/core';
import {Log} from "../logging/Log";
import {ISchematicsOptions} from "./ISchematicsOptions";
import * as _ from 'lodash';
import {NodeJsSyncHost} from "@angular-devkit/core/node";
import {PlatformUtils} from "commons-base";



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

  async run() {

    this._options.argv.__BASEDIR__ = this.basedir;
    this._options.argv.__WORKDIR__ = this.workdir;

    const engineHost = new FileSystemEngineHost({basedir: this.basedir});
    const engine = new SchematicEngine(engineHost);

    // Add support for schemaJson.
    const registry = new schema.CoreSchemaRegistry(formats.standardFormats);
    engineHost.registerOptionsTransform(validateOptionsWithSchema(registry));

    engineHost.registerTaskExecutor(BuiltinTaskExecutor.NodePackage);
    engineHost.registerTaskExecutor(BuiltinTaskExecutor.RepositoryInitializer);

    const collection = engine.createCollection(this.collectionName);
    const schematic = collection.createSchematic(this.schematicName);

    const fsHost = new virtualFs.ScopedHost(new NodeJsSyncHost(),normalize(this.workdir));

    // const host = observableOf(new FileSystemTree(new FileSystemHost(this.workdir)));
    const host = observableOf(new FileSystemTree(fsHost));
    let drySink = new DryRunSink(fsHost, this._options.force);
    let fsSink = new HostSink(fsHost, this._options.force);

    let error: boolean = false;
    let nothingDone: boolean = true;
    let dryRun: boolean = false;

    let loggingQueue: string[] = [];

// Logs out dry run events.
    drySink.reporter.subscribe((event: DryRunEvent) => {
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


    const debug = true;
    await new Promise((resolve, reject) => {
      schematic
        .call(this._options.argv, host)
        .pipe(
          map((tree: Tree) => Tree.optimize(tree)),
          concatMap((tree: Tree) => {
            return drySink.commit(tree).pipe(
              ignoreElements(),
              concat(observableOf(tree)));
          }),

          concatMap((tree: Tree) => {
            if (!error) {
              // Output the logging queue.
              loggingQueue.forEach(log => Log.info(log));
            }

            if (nothingDone) {
              Log.info('Nothing to be done.');
            }

            if (dryRun || error) {
              return observableOf(tree);
            }

            return fsSink.commit(tree).pipe(
              ignoreElements(),
              concat(observableOf(tree)));
          }),
          concatMap(() => engine.executePostTasks())
        )
        .subscribe({
          complete() {
            Log.info('Done');
            resolve();
          },
          error(err: Error) {
            if (debug) {
              Log.error('An error occured:\n' + err.stack);
            } else {
              Log.error(err);
            }
            reject(err);
          },
        });
    })

  }


}
