import {Event} from 'commons-eventbus';
import {existsSync, PathLike, watch} from 'fs';
import {resolve} from 'path';
import {AbstractWatcher} from './AbstractWatcher';


/**
 * Supposed to be emitted by FileWatcher
 */
@Event()
export class FileChanged {
  /**
   * Parameters passed by FileWatcher
   */
  $watcher: {
    filename: PathLike;
    type: string;
  };
}

/**
 * A file watcher
 */
export class FileWatcher extends AbstractWatcher {
  /**
   * Watched path
   */
  protected readonly path: PathLike;

  /**
   * Whether or not the watcher is recursive
   */
  protected readonly recursive: boolean;

  constructor(config: any) {
    super(config);

    if (typeof config.path !== 'string') {
      throw new Error('Parameter path must be a string.');
    }

    this.path = resolve(config.path);
    this.recursive = !!config.recursive;
  }

  async isValid(): Promise<boolean> {
    return existsSync(this.path);
  }

  async start(): Promise<void> {
    if (typeof this.watcher !== 'undefined') {
      throw new Error('Watcher is already started!');
    }

    this.watcher = watch(this.path, {
      persistent: true,
      recursive: this.recursive,
    }, async (type, filename) => {
      await this.emitEvent({
        type,
        filename,
      });

      await this.executeTasks({
        type,
        filename,
      });
    });
  }

  async stop(): Promise<void> {
    if (typeof this.watcher === 'undefined') {
      throw new Error('Watcher is not started!');
    }

    this.watcher.close();
    this.watcher = undefined;
  }
}
