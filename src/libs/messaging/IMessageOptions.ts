export interface IMessageOptions {

  skipLocal?: boolean;

  mode?: 'map' | 'only_value' | 'embed_nodeId' | 'raw';

  nodeIds?: string[];

  filterErrors?: boolean;

}
