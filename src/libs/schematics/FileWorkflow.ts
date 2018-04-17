/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Path, logging, schema, virtualFs} from '@angular-devkit/core';
import {
  DryRunSink,
  //HostSink,
  //HostTree,
  SchematicEngine,
  Tree,
  //UnsuccessfulWorkflowExecution,
  formats,
  //workflow,
  DryRunEvent, FileSystemSink, FileSystemTree,
} from '@angular-devkit/schematics';  // tslint:disable-line:no-implicit-dependencies
//import {EMPTY, Observable, Subject, concat, of, throwError} from 'rxjs';
import {concat, concatMap, ignoreElements, map} from 'rxjs/operators';
//import {reduce, tap} from 'rxjs/internal/operators';
import {BuiltinTaskExecutor} from "@angular-devkit/schematics/tasks/node";
import {FileSystemEngineHost} from "./FileSystemEngineHost";
import {FileSystemHost, validateOptionsWithSchema} from "@angular-devkit/schematics/tools";
import {Subject} from "rxjs/Subject";
import {Observable} from "rxjs/Observable";
import {of} from "rxjs/observable/of";
import {Logger} from "@angular-devkit/core/src/logger";

//import {Workflow} from "@angular-devkit/schematics/src/workflow";


export class FileWorkflow /*implements Workflow */ {

  protected _engine: SchematicEngine<{}, {}>;
  protected _engineHost: FileSystemEngineHost;
  protected _registry: schema.CoreSchemaRegistry;
  protected _reporter: Subject<DryRunEvent> = new Subject();
//  protected _lifeCycle: Subject<workflow.LifeCycleEvent> = new Subject();
  // protected _context: workflow.WorkflowExecutionContext[];


  constructor(
    protected _host: FileSystemHost,//virtualFs.Host,
    protected _options: {
      basedir: string;
      workdir: string;
      force?: boolean;
      dryRun?: boolean;
      root?: Path,
      packageManager?: string;
    },
  ) {
    /**
     * Create the SchematicEngine, which is used by the Schematic library as callbacks to load a
     * Collection or a Schematic.
     */
    this._engineHost = new FileSystemEngineHost({basedir: _options.basedir});
    this._engine = new SchematicEngine(this._engineHost);

    // Add support for schemaJson.
    this._registry = new schema.CoreSchemaRegistry(formats.standardFormats);
    this._engineHost.registerOptionsTransform(validateOptionsWithSchema(this._registry));

    this._engineHost.registerTaskExecutor(
      BuiltinTaskExecutor.NodePackage,
      {
        //allowPackageManagerOverride: true,
        packageManager: this._options.packageManager,
        rootDirectory: this._options.root,
      },
    );
    this._engineHost.registerTaskExecutor(
      BuiltinTaskExecutor.RepositoryInitializer,
      {
        rootDirectory: this._options.root,
      },
    );
    //this._engineHost.registerTaskExecutor(BuiltinTaskExecutor.RunSchematic);
    //this._engineHost.registerTaskExecutor(BuiltinTaskExecutor.TslintFix);
    //this._context = [];
  }

  /*
  get context(): Readonly<workflow.WorkflowExecutionContext> {
    const maybeContext = this._context[this._context.length - 1];
    if (!maybeContext) {
      throw new Error('Cannot get context when workflow is not executing...');
    }
    return maybeContext;
  }
  */

  get registry(): schema.SchemaRegistry {
    return this._registry;
  }

  get reporter(): Observable<DryRunEvent> {
    return this._reporter.asObservable();
  }

  /*
  get lifeCycle(): Observable<workflow.LifeCycleEvent> {
    return this._lifeCycle.asObservable();
  }
*/

  execute(
    //options: Partial<workflow.WorkflowExecutionContext>   & workflow.RequiredWorkflowExecutionContext,
    options: { logger: Logger, [k: string]: any }
  ): Observable<any> {
    //const parentContext = this._context[this._context.length - 1];

    //if (!parentContext) {
    //this._lifeCycle.next({kind: 'start'});
    //}

    /** Create the collection and the schematic. */
    const collection = this._engine.createCollection(options.collection);
    // Only allow private schematics if called from the same collection.
    const allowPrivate = options.allowPrivate
    //|| (parentContext && parentContext.collection === options.collection);
    const schematic = collection.createSchematic(options.schematic)//, allowPrivate);

    // We need two sinks if we want to output what will happen, and actually do the work.
    // Note that fsSink is technically not used if `--dry-run` is passed, but creating the Sink
    // does not have any side effect.
    const dryRunSink = new DryRunSink(this._options.workdir, this._options.force);
    const fsSink = new FileSystemSink(this._options.workdir, this._options.force);
    //const fsSink = new HostSink(this._host, this._options.force);
    //const host = of(new FileSystemTree(new FileSystemHost(this._options.basedir)));
    let error = false;
    const dryRunSubscriber = dryRunSink.reporter.subscribe(event => {
      this._reporter.next(event);
      error = error || (event.kind == 'error');
    });

    //this._lifeCycle.next({kind: 'workflow-start'});

    /*
    const context = {
      ...options,
      debug: options.debug || false,
      logger: options.logger || (parentContext && parentContext.logger) ||
      new logging.NullLogger(),
      parentContext,
    };
    this._context.push(context);
*/
    //return concat(
    return schematic.call(
      options.options,
      of(new FileSystemTree(this._host)),
      {
        debug: options.debug,
        logger: options.logger,
      })
      .pipe(
        map(tree => Tree.optimize(tree)),
        concatMap((tree: Tree) => {
          return dryRunSink.commit(tree).pipe(
            ignoreElements(),
            concat(of(tree)));
        }),
        concatMap((tree: Tree) => {
          dryRunSubscriber.unsubscribe();
          if (error || this._options.dryRun) {
            return of(tree);
          }
          return fsSink.commit(tree).pipe(
            ignoreElements(),
            concat(of(tree)));
        }),
        concatMap(() => this._engine.executePostTasks())
      );


    // reduce(() => { }),


  }
}
