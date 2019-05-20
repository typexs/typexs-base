import {AbstractWatcherConfig} from './AbstractWatcherConfig';

/**
 * File watcher config
 */
export interface FileWatcherConfig extends AbstractWatcherConfig {
  type: 'file';
  name: string;
  path: string;
  recursive?: boolean;
  event?: string;
  task?: {
    names: string[];
    params?: any;
  }
}

/**
 * Whether or not some object has a parameter named params
 *
 * @param something Some object
 */
export function hasPath(something: object): something is { path: unknown; } {
  return 'path' in something;
}

/**
 * Whether or not some object has a parameter named params
 *
 * @param something Some object
 */
export function hasRecursive(something: object): something is { recursive: boolean; } {
  return 'recursive' in something;
}

/**
 * Whether or not a watcher base config is a file watcher config
 *
 * @param something A watcher base config
 */
export function isFileWatcherConfig(something: AbstractWatcherConfig): something is FileWatcherConfig {
  if (something.type !== 'file') {
    return false;
  }

  if (!hasPath(something) || typeof something.path !== 'string') {
    return false;
  }

  return !hasRecursive(something) || typeof something.recursive !== 'boolean';
}
