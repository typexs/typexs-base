import {Config} from '@allgemein/config';
import {AbstractWatcher} from './AbstractWatcher';
import {FileWatcher} from './FileWatcher';
import {isFileWatcherConfig} from './FileWatcherConfig';
import {isArray, isWatcherConfig, WatcherConfig} from './WatcherConfig';

/**
 * Watcher registry
 */
export class WatcherRegistry {
  /**
   * Name of the watcher registry
   */
  static readonly NAME = WatcherRegistry.name;

  /**
   * Name of the corresponding entry in the config
   */
  static readonly CONFIG_ENTRY = 'watchers';

  /**
   * Parsed config
   */
  private readonly config: WatcherConfig[] = [];

  /**
   * List of watchers
   */
  private readonly watchers: AbstractWatcher[] = [];

  /**
   * Create a new watcher registry
   */
  constructor() {
    const config: unknown = Config.get(WatcherRegistry.CONFIG_ENTRY);

    if (config === null) {
      return;
    }

    if (!isArray(config)) {
      throw new Error(`Config entry ${WatcherRegistry.CONFIG_ENTRY} must be an array!`);
    }

    const watcherConfigs = config.filter(isWatcherConfig);

    if (watcherConfigs.length < config.length) {
      throw new Error(`Every element of config entry ${WatcherRegistry.CONFIG_ENTRY} must be a WatcherConfig.`);
    }

    this.config = watcherConfigs;
  }

  /**
   * Initialize watchers
   */
  async init() {
    for (const watcherConfig of this.config) {
      if (isFileWatcherConfig(watcherConfig)) {
        const watcher = new FileWatcher(watcherConfig);

        if (!await watcher.isValid()) {
          throw new Error(`Watcher ${watcherConfig.name} is invalid!`);
        }

        this.watchers.push(watcher);
      }
    }
  }

  /**
   * Start all watchers
   */
  async startAll() {
    return Promise.all(this.watchers.map((watcher) => {
      return watcher.start();
    }));
  }

  /**
   * Stop all watchers
   */
  async stopAll() {
    return Promise.all(this.watchers.map((watcher) => {
      return watcher.stop();
    }));
  }
}
