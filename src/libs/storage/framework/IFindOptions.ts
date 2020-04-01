export interface IFindOptions {
  raw?: boolean;
  limit?: number;
  offset?: number;
  timeout?: number;
  sort?: { [key: string]: 'asc' | 'desc' };
}
