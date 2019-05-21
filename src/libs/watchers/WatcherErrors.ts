/**
 * Error that indicates that a watcher is (already) started
 */
export class WatcherStarted extends Error {
  constructor(name: string) {
    super(`Watcher ${name} started.`);
  }
}

/**
 * Error that indicates that a watcher is (already) stopped
 */
export class WatcherStopped extends Error {
  constructor(name: string) {
    super(`Watcher ${name} stopped.`);
  }
}

/**
 * Error that indicates that a watcher has an invalid config
 */
export class InvalidWatcherConfig extends Error {
  constructor(name: string) {
    super(`Watcher ${name} has invalid config.`);
  }
}
