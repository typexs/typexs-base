import {ILoggerOptions} from './ILoggerOptions';
import {ConsoleTransportOptions} from 'winston/lib/winston/transports';

export const DEFAULT_LOGGER_OPTIONS: ILoggerOptions = {
  enable: true,

  level: 'info',

  transports: [
    {
      console: <ConsoleTransportOptions>{
        name: 'console',
        // stderrLevels: [],
        timestamp: true,
        json: false,

      }
    }
  ]
};
