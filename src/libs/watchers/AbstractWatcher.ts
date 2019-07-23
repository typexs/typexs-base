import * as _ from 'lodash';
import {EventBus, IEventDef} from 'commons-eventbus';
import EventBusMeta from 'commons-eventbus/bus/EventBusMeta';
import {FSWatcher} from 'fs';
import {TasksHelper} from '../tasks/TasksHelper';
import {AbstractWatcherConfig} from './AbstractWatcherConfig';
import {hasEvent, hasTask, isWatcherConfig} from './WatcherConfig';
import {InvalidWatcherConfig} from './WatcherErrors';

/**
 * An abstract watcher
 */
export abstract class AbstractWatcher {
  /**
   * Event to be emitted
   */
  protected readonly eventDef: IEventDef;

  /**
   * Name of the watcher
   */
  protected readonly name: string;

  /**
   * List of tasks
   */
  protected readonly taskNames: string[] = [];

  /**
   * Parameters for tasks
   */
  protected readonly taskParams: any = {};

  /**
   * Instance of FSWatcher
   */
  protected watcher: FSWatcher;

  /**
   * Whether or not the watcher is valid
   */
  abstract isValid(): Promise<boolean>;

  /**
   * Start the watcher
   */
  abstract start(): Promise<void>;

  /**
   * Stop the watcher
   */
  abstract stop(): Promise<void>;

  /**
   * Create a new abstract watcher
   *
   * @param config Watcher config
   */
  protected constructor(config: AbstractWatcherConfig) {
    this.name = config.name;

    if (!isWatcherConfig(config)) {
      throw new InvalidWatcherConfig(this.name);
    }

    if (hasEvent(config)) {
      this.eventDef = EventBusMeta.$().findEvent(config.event);
    }

    if (hasTask(config)) {
      this.taskNames = config.task.names;
      this.taskParams = config.task.params;
    }
  }

  /**
   * Emit an event
   *
   * @param params
   */
  protected async emitEvent(params: any) {
    if (_.isUndefined(this.eventDef)) {
      return;
    }

    const instance = Reflect.construct(this.eventDef.clazz, []);
    _.assign(instance, {
      $watcher: params,
    });

    return EventBus.postAndForget(instance);
  }

  /**
   * Execute tasks
   */
  protected async executeTasks(params: any) {
    if (_.isArray(this.taskNames) && !_.isEmpty(this.taskNames)) {
      await TasksHelper.exec(this.taskNames, {
        ...this.taskParams,
        $watcher: params,
        skipTargetCheck: false
      });
    }
  }
}
