import {ILoggerApi} from '../logging/ILoggerApi';

export interface IAsyncQueueOptions {
  /**
   * Name of the queue
   */
  name: string;

  /**
   * Number of concurrent executions
   */
  concurrent?: number;

  /**
   * Override standard logger
   */
  logger?: ILoggerApi;

}
