import {TransportOptions} from "winston";

export const K_LOGGING = "logging";


export interface ILoggerOptions  {

    enable: boolean

    level?: string

    events?: boolean

    transports?: {[k: string]: TransportOptions}[]
}
