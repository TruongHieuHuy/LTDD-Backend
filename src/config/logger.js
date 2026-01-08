const pino = require('pino');

// Configure pino logger
// In development, use pino-pretty for human-readable logs.
// In production, use standard JSON logs.
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
});

// In a real production environment, you would disable pino-pretty
// const logger = pino();
// if (process.env.NODE_ENV !== 'production') {
//   logger.transport = {
//     target: 'pino-pretty',
//     options: {
//       colorize: true,
//       translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
//       ignore: 'pid,hostname',
//     },
//   }
// }


module.exports = logger;
