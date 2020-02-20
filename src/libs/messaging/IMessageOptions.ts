export interface IMessageOptions {

  mode?: 'map' | 'only_value' | 'embed_nodeId' | 'raw';

  nodeIds?: string[];

  filterErrors?: boolean;

}
