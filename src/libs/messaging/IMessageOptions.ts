import {ILoggerApi} from '../logging/ILoggerApi';

export interface IMessageOptions {

  skipLocal?: boolean;

  mode?: 'map' | 'only_value' | 'embed_nodeId' | 'raw';

  // nodeIds?: string[];
  /**
   * used for defining targets to send messages
   */
  targetIds?: string[];

  filterErrors?: boolean;

  logger?: ILoggerApi;

  timeout?: number;

}
