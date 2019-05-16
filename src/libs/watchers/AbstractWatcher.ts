import {EventBus, IEventDef} from 'commons-eventbus';
import EventBusMeta from 'commons-eventbus/bus/EventBusMeta';
import {FSWatcher} from "fs";
import {TasksHelper} from '../tasks/TasksHelper';

/**
 * Check if something is string
 *
 * @param something Something to check
 */
function isString(something: any): something is string {
  return typeof something === 'string';
}

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
  protected constructor(config: any) {
    this.name = config.name;

    if (typeof config.eventDef === 'string') {
      this.eventDef = EventBusMeta.$().findEvent(config.eventDef);
    }

    if (typeof config.task !== 'undefined') {
      if (!Array.isArray(config.task.names) || !config.task.names.every(isString)) {
        throw new Error('Task names must be an array of strings.');
      }

      this.taskNames = config.task.names;
      this.taskParams = config.task.params;
    }

    if (typeof this.eventDef === 'undefined' && this.taskNames.length === 0) {
      throw new Error('Either an event or at least one task has to be provided.');
    }
  }

  /**
   * Emit an event
   *
   * @param params
   */
  protected async emitEvent(params: any) {
    if (typeof this.eventDef === 'undefined') {
      return;
    }

    await EventBus.post({
      ...Reflect.construct(this.eventDef.clazz, []),
      ...{
        $watcher: params,
      },
    });
  }

  /**
   * Execute tasks
   */
  protected async executeTasks(params: any) {
    await TasksHelper.exec(this.taskNames, {
      ...this.taskParams,
      $watcher: params,
    })
  }
}
