export interface ICacheOptions {
}

export interface ICacheGetOptions extends ICacheOptions {
}

export interface ICacheSetOptions extends ICacheOptions {
  ttl?: number;
}
