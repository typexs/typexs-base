import {IStorageOptions} from '../../IStorageOptions';
import {BaseConnectionOptions} from 'typeorm/connection/BaseConnectionOptions';

// @ts-ignore
export interface ITypeOrmStorageOptions extends IStorageOptions, BaseConnectionOptions {


}
