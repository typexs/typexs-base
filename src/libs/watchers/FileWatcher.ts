import {existsSync, PathLike, watch} from 'fs';
import {join, resolve} from 'path';
import {AbstractWatcher} from './AbstractWatcher';
import {FileWatcherConfig, isFileWatcherConfig} from './FileWatcherConfig';
import {InvalidWatcherConfig, WatcherStarted, WatcherStopped} from './WatcherErrors';
import {Log} from '../logging/Log';
import {IFileStat} from '../filesystem/IFileStat';
import {FileReadUtils} from '../filesystem/FileReadUtils';

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
      let stats: IFileStat = {};
      if (exists) {
        try {
          stats = await FileReadUtils.statInfo(filepath);
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
