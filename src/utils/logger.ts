import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { getConfig } from '../config';

let logger: winston.Logger | null = null;

export function createLogger(): winston.Logger {
  if (logger) return logger;

  const config = getConfig();
  const logDir = path.dirname(config.logging.file);

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  logger = winston.createLogger({
    level: config.logging.level,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: 'cyborg-bot' },
    transports: [
      new winston.transports.File({
        filename: config.logging.file,
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5,
      }),
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length > 1
              ? ` ${JSON.stringify(meta)}`
              : '';
            return `${timestamp} ${level}: ${message}${metaStr}`;
          })
        ),
      }),
    ],
  });

  return logger;
}

export function getLogger(): winston.Logger {
  if (!logger) return createLogger();
  return logger;
}