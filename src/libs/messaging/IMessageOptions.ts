import {ILoggerApi} from '../logging/ILoggerApi';

export interface IMessageOptions {

  skipLocal?: boolean;

  outputMode?: 'map' | 'only_value' | 'embed_nodeId' | 'responses';

  // nodeIds?: string[];
  /**
   * used for defining targets to send messages
   */
  targetIds?: string[];

  filterErrors?: boolean;

  logger?: ILoggerApi;

  timeout?: number;

  filter?: (x: any) => boolean;

}
