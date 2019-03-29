export interface ICacheBinConfig {

  type: string;

  nodeId: string;

  /**
   * Adapter specific keys
   */
  [key: string]: any;
}
