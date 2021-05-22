import * as _ from 'lodash';
import {ClientOpts, createClient, RedisClient} from 'redis';
import {IRedisCacheClient} from './IRedisCacheClient';
import {ICacheGetOptions, ICacheSetOptions} from '../../../libs/cache/ICacheOptions';


export class RedisCacheClient implements IRedisCacheClient {

  options: ClientOpts;

  client: RedisClient;

  private connected = false;


  constructor(options: ClientOpts) {
    this.options = options;
  }


  connect(): Promise<IRedisCacheClient> {
    if (this.connected) {
      return Promise.resolve(this);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('timeout redis'));
      }, 5000);
      const onError = (err: Error) => {
        reject(err);
      };
      this.client = createClient(this.options);
      // unref for not blocking in shutdown
      this.client.unref();
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
          if (_.isBuffer(reply)) {
            reply = reply.toString();
          }
          const _value = this.unserialize(reply);
          resolve(_value);
        }
      });
    });
  }

  serialize(v: any) {
    return JSON.stringify(v);
  }

  unserialize(v: any) {
    try {
      return JSON.parse(v);
    } catch (e) {
      return null;
    }

  }

  set(key: string, value: any, options?: ICacheSetOptions) {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.connected) {
        reject(new Error('no connection'));
      }

      const _value = this.serialize(value);
      const args: any[] = [key, _value];
      if (options && options.ttl) {
        if (options.ttl % 1000 === 0) {
          args.push('EX', Math.round(options.ttl / 1000));
        } else {
          args.push('PX', options.ttl);
        }

      }
      args.push((err: Error, reply: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(reply);
        }
      });
      this.client.set.apply(this.client, args);
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
            resolve(null);
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
    // this.connected = false;
    return null;
  }

  async removeKeysByPattern(name: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.client.keys(name, (err, reply) => {
        if (err) {
          reject(err);
        } else {
          if (!_.isEmpty(reply)) {
            this.client.del(reply, (err1, reply1) => {
              if (err1) {
                reject(err1);
              } else {
                resolve(reply1);
              }
            });
          } else {
            resolve(0);
          }
        }
      });
    });

    // return null;
  }

}
