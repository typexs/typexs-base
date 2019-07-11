import {AbstractWatcherConfig} from './AbstractWatcherConfig';
import {FileWatcherConfig, isFileWatcherConfig} from './FileWatcherConfig';
import {Log} from '../logging/Log';

/**
 * Union type of possible watcher configs
 */
export type WatcherConfig = FileWatcherConfig;

/**
 * Whether or not something unknown is an array
 * @param something Something unknown
 */
export function isArray(something: unknown): something is unknown[] {
  return Array.isArray(something);
}

/**
 * Whether or not something unknown is a string
 *
 * @param something Something unknown
 */
export function isString(something: unknown): something is string {
  return typeof something === 'string';
}

/**
 * Whether or not some object has a parameter named type
 *
 * @param something Some object
 */
export function hasType(something: object): something is { type: unknown; } {
  return 'type' in something;
}

/**
 * Whether or not some object has a parameter named name
 *
 * @param something Some object
 */
export function hasName(something: object): something is { name: unknown; } {
  return 'name' in something;
}

/**
 * Whether or not some object has a parameter named event
 *
 * @param something Some object
 */
export function hasEvent(something: object): something is { event: unknown; } {
  return 'event' in something;
}

/**
 * Whether or not some object has a parameter named task
 *
 * @param something Some object
 */
export function hasTask(something: object): something is { task: unknown; } {
  return 'task' in something;
}

/**
 * Whether or not some object has a parameter named names
 *
 * @param something Some object
 */
export function hasNames(something: object): something is { names: unknown; } {
  return 'names' in something;
}

/**
 * Whether or not some object has a parameter named params
 *
 * @param something Some object
 */
export function hasParams(something: object): something is { params: unknown; } {
  return 'params' in something;
}

/**
 * Whether or not something is a watcher base config
 *
 * @param something Something unknown
 */
export function isWatcherBaseConfig(something: unknown): something is AbstractWatcherConfig {
  if (typeof something !== 'object') {
    return false;
  }

  if (!hasType(something) || typeof something.type !== 'string') {
    return false;
  }

  if (!hasName(something) || typeof something.name !== 'string') {
    return false;
  }

  if (hasEvent(something) && typeof something.event !== 'string') {
    return false;
  }

  if (hasTask(something)) {
    if (typeof something.task !== 'object') {
      return false;
    }

    if (!hasNames(something.task) || !isArray(something.task.names) || !something.task.names.every(isString)) {
      return false;
    }

    if (!hasParams(something.task) || typeof something.task.params !== 'object') {
      return false;
    }
  }

  if (!hasEvent(something) && !hasTask(something)) {
    Log.warn(`Config needs at least one event or task.`);
    return false;
  }

  return true;
}

/**
 * Whether or not something unknown is a watcher config
 *
 * @param something Something unknown
 */
export function isWatcherConfig(something: unknown): something is WatcherConfig {
  if (isWatcherBaseConfig(something)) {
    return isFileWatcherConfig(something);
  }

  return false;
}
