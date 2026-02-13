import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import { api } from './routes/api';
import { forms } from './routes/forms';
import { menu } from './routes/menu';
import { triggers } from './routes/triggers';

const app = new Hono();
const internal = new Hono();

/* ================================================================== */
/*  Security middleware                                                */
/* ==================================================================  */

/** Set security headers on every response */
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Cache-Control', 'no-store');
});

/** Global error handler — never leak stack traces (OWASP A09) */
app.onError((err, c) => {
  console.error('Unhandled server error:', err.message);
  return c.json({ status: 'error', message: 'internal server error' }, 500);
});

/** 404 catch-all */
app.notFound((c) => {
  return c.json({ status: 'error', message: 'not found' }, 404);
});

internal.route('/menu', menu);
internal.route('/form', forms);
internal.route('/triggers', triggers);

app.route('/api', api);
app.route('/internal', internal);

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
