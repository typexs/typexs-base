import {ILoggerApi} from '../logging/ILoggerApi';

export interface IMessageOptions {

  /**
   * Each message will be locally processed (calling getResponse; look in Message). With this flag it can be prevented.
   */
  skipLocal?: boolean;

  /**
   * If no selected targets are given then no message will be send to unknown hosts. This can be prevented be this flag.
   * The message will be send to unknown hosts and will wait for response till it arrive or will be timed out.
   */
  waitIfNoTarget?: boolean;

  outputMode?: 'map' | 'only_value' | 'embed_nodeId' | 'responses';

  // nodeInfos?: string[];
  /**
   * used for defining targets to send messages
   */
  targetIds?: string[];

  filterErrors?: boolean;

  logger?: ILoggerApi;

  timeout?: number;

  filter?: (x: any) => boolean;

}
