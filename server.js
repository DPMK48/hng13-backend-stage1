import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import router from './routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middlewares
app.use(express.json({ limit: '1mb' }));
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Mount routes (router handles /strings and /strings/...)
app.use('/', router);

// Optional: log route order for debugging
if (process.env.DEBUG_ROUTES === '1') {
  try {
    const stack = router.stack || [];
    console.log('Registered routes (in order):');
    stack.forEach((l) => {
      if (l.route && l.route.path) {
        const methods = Object.keys(l.route.methods || {}).join(',').toUpperCase();
        console.log(`- [${methods}] ${l.route.path}`);
      }
    });
  } catch (e) {}
}

// Health-check
app.get('/', (req, res) => res.json({ ok: true, service: 'String Analyzer' }));

// 404 fallback
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Server error' });
});

const server = app.listen(PORT, () => {
  console.log(`String Analyzer listening on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. If you have another instance running, stop it or set a different PORT.`);
    process.exit(1);
  }
  // For other errors, rethrow so the default behavior still occurs
  console.error('Server error:', err);
  process.exit(1);
});
