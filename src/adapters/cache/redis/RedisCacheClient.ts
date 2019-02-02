import {ClientOpts, createClient, RedisClient} from "redis";
import {IRedisCacheClient} from "./IRedisCacheClient";
import {ICacheGetOptions, ICacheSetOptions} from "../../../libs/cache/ICacheOptions";


export class RedisCacheClient implements IRedisCacheClient {

  options: ClientOpts;

  client: RedisClient;

  private connected: boolean = false;


  constructor(options: ClientOpts) {
    this.options = options;
  }


  connect(): Promise<IRedisCacheClient> {
    if (this.connected) {
      return Promise.resolve(this);
    }
    return new Promise(
      (resolve, reject) => {
        let timer = setTimeout(() => {
          reject(new Error('timeout redis'));
        }, 5000);
        const onError = (err: Error) => {
          reject(err);
        };
        this.client = createClient(this.options);
        this.client.once('error', onError);
        this.client.once('ready', args => {
          clearTimeout(timer);
          this.client.removeListener('error', onError);
          this.connected = true;
          resolve(this);
        });
      });
  }


  get(key: string, options?: ICacheGetOptions) {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.connected) {
        reject(new Error('no connection'));
      }
      this.client.get(key, (err, reply) => {
        if (err) {
          reject(err);
        } else {
          resolve(reply);
        }
      });
    });
  }


  set(key: string, value: any, options?: ICacheSetOptions) {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.connected) {
        reject(new Error('no connection'));
      }

      if (options.ttl) {
        this.client.set(key, value, 'EX', options.ttl, (err, reply) => {
          if (err) {
            reject(err);
          } else {
            resolve(reply);
          }
        });
      } else {
        this.client.set(key, value, (err, reply) => {
          if (err) {
            reject(err);
          } else {
            resolve(reply);
          }
        });

      }

    });
  }


  close() {
    if (this.connected) {
      return new Promise(
        (resolve, reject) => {
          if (this.client) {
            this.client.quit((err, reply) => {
              if (err) {
                reject(err);
              } else {
                resolve(reply);
              }
            });
          } else {

            resolve();
          }
        })
        .then(x => {
          this.connected = false;
          this.client = null;
          return x;
        })
        .catch(err => {
          this.connected = false;
          this.client = null;
          throw err;
        });
    }
    this.connected = false;
    return null;
  }

}
