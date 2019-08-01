import * as _ from 'lodash';
import {existsSync, PathLike, stat, watch} from 'fs';
import {join, resolve} from 'path';
import {AbstractWatcher} from './AbstractWatcher';
import {FileWatcherConfig, isFileWatcherConfig} from './FileWatcherConfig';
import {InvalidWatcherConfig, WatcherStarted, WatcherStopped} from './WatcherErrors';
import {Log} from '../logging/Log';
import {IFileStat} from './IFileStat';
import {STATS_METHODS} from './Constants';

/**
 * A file watcher
 */
export class FileWatcher extends AbstractWatcher {
  /**
   * Watched path
   */
  private readonly path: PathLike;

  /**
   * Whether or not the watcher is recursive
   */
  private readonly recursive: boolean;

  /**
   * Create a new file watcher
   *
   * @param config Config for the file watcher
   */
  constructor(config: FileWatcherConfig) {
    super(config);

    if (!isFileWatcherConfig(config)) {
      throw new InvalidWatcherConfig(this.name);
    }

    this.path = resolve(config.path);
    this.recursive = !!config.recursive;
  }

  async isValid(): Promise<boolean> {
    if (!existsSync(this.path)) {
      Log.error(`Path '${this.path}' does not exist!`);
      return false;
    }

    return true;
  }

  async start(): Promise<void> {
    if (typeof this.watcher !== 'undefined') {
      throw new WatcherStarted(this.name);
    }

    this.watcher = watch(this.path, {
      persistent: true,
      recursive: this.recursive,
    }, async (type, filename) => {
      const filepath = join(<string>this.path, filename);
      const exists = existsSync(filepath);
      const stats: IFileStat = {};
      if (exists) {
        try {
          const _stats = await new Promise((resolve, reject) => {
            stat(filepath, (err, _stats) => {
              if (err) {
                reject(err);
              } else {
                resolve(_stats);
              }
            });
          });
          for (const statKey of _.keys(_stats)) {
            stats[statKey] = _stats[statKey];
          }
          STATS_METHODS.forEach(method => {
            stats[method] = _stats[method]();
          });
        } catch (e) {
        }
      }

      await Promise.all([
        this.emitEvent({
          path: this.path,
          name: this.name,
          type,
          filename,
          exists,
          stats
        }),

        this.executeTasks({
          path: this.path,
          name: this.name,
          type,
          filename,
          exists,
          stats
        }),
      ]);
    });
  }

  async stop(): Promise<void> {
    if (typeof this.watcher === 'undefined') {
      throw new WatcherStopped(this.name);
    }

    this.watcher.close();
    this.watcher = undefined;
  }
}
