import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import {adminRouter} from './routes/admin.js';
import {mobileRouter} from './routes/mobile.js';
import {config, isProduction} from './config.js';
import {ensureBootstrapAdmin, migrate, pool} from './db.js';
import {HttpError} from './httpError.js';

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.use(helmet());
  app.use(cors({origin: true, credentials: true}));
  app.use(express.json({limit: '1mb'}));
  app.use(morgan(isProduction ? 'combined' : 'dev'));

  app.get('/health', (_req, res) => {
    res.json({status: 'ok', service: 'livekit-control-plane'});
  });

  app.use('/admin', adminRouter);
  app.use('/api', mobileRouter);

  app.use((_req, _res, next) => {
    next(new HttpError(404, '接口不存在', 'route_not_found'));
  });

  app.use((error, _req, res, _next) => {
    const status = error.status || 500;
    if (status >= 500) {
      console.error(error);
    }

    res.status(status).json({
      code: error.code || 'internal_error',
      message: status >= 500 ? '服务暂时不可用' : error.message,
    });
  });

  return app;
};

export const start = async () => {
  if (config.autoMigrate) {
    await migrate();
    await ensureBootstrapAdmin();
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`livekit-control-plane listening on ${config.port}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

