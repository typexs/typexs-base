export interface IAggregateOptions {

  /**
   * result limit
   */
  limit?: number;


  /**
   * result offset
   */
  offset?: number;

  /**
   * result sort definition
   */
  sort?: { [key: string]: 'asc' | 'desc' };

  /**
   * disable the count query
   */
  disableCount?: boolean;


  /**
   * enable auto parse of numbers
   */
  autoParseNumbers?: boolean;
}
