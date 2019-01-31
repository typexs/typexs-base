export interface IFindOptions {
  raw?: boolean;
  limit?: number;
  offset?: number;
  sort?: { [key: string]: 'asc' | 'desc' }
}
