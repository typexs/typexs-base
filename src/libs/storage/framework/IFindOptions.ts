export interface IFindOptions {
  cache?: boolean;
  raw?: boolean;
  limit?: number;
  offset?: number;
  timeout?: number;
  sort?: { [key: string]: 'asc' | 'desc' };
}
