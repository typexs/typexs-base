import {Connection, EntityManager, getConnectionManager} from "typeorm";
import {Storage} from "./Storage";
import {Log} from "../logging/Log";
import {Progress} from "../Progress";

export class ConnectionWrapper {

    static $INC: number = 0;

    inc: number = ConnectionWrapper.$INC++;

    private name: string = null;

    private static _LOCK = new Progress();

    storage: Storage;

    connection: Connection;

    constructor(s: Storage, conn?: Connection) {
        this.storage = s;
        this.connection = conn;
        this.name = this.storage.name
    }


    /**
     * Persists (saves) all given entities in the database.
     * If entities do not exist in the database then inserts, otherwise updates.
     *
     * @deprecated
     */
    async persist<Entity>(o: Entity): Promise<any> {
        return this.manager.save(o)
    }

    async save<Entity>(o: Entity): Promise<any> {
        try {
            return this.manager.save(o)
        } catch (err) {
            Log.error(err);
            throw err
        }
    }


    isSingleConnection(): boolean {
        return this.storage.isSingleConnection()
    }


    async connect(): Promise<ConnectionWrapper> {
        await ConnectionWrapper._LOCK.startWhenReady();
        try {
            if (!this.connection) {
                this.connection = await getConnectionManager().get(this.name);
            }

            if (!this.connection.isConnected) {
                this.connection = await this.connection.connect()
            }
        } catch (err) {
            Log.error(err);
        } finally {
            ConnectionWrapper._LOCK.ready();
        }
        return Promise.resolve(this)
    }


    get manager(): EntityManager {
        return this.connection.manager
    }

    async close(force: boolean = false): Promise<ConnectionWrapper> {
        await ConnectionWrapper._LOCK.startWhenReady();
        try {
            if (!this.isSingleConnection() ||  force) {
                await this.storage.remove(this);
            }
        } catch (err) {
            Log.error(err);
        } finally {
            ConnectionWrapper._LOCK.ready();
        }

        return Promise.resolve(this)
    }

}
