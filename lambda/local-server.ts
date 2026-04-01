import { app } from './index';

declare const Bun: any;

const port = Number(process.env.PORT || 8787);

Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Local API server listening on http://localhost:${port}`);
