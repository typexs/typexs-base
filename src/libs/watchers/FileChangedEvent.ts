import {Event} from 'commons-eventbus';
import {PathLike} from 'fs';

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
