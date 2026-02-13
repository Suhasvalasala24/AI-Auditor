import type { Express } from "express";
import { type Server } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  const apiProxy = createProxyMiddleware({
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
    ws: false,
    proxyTimeout: 10000,
    timeout: 10000,
    pathRewrite: (path, req) => req.originalUrl,
    onError: (err, _req, res) => {
      console.error('Proxy error:', err.message);
      if (res && !res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Backend unavailable', details: err.message }));
      }
    }
  });

  app.use('/api', apiProxy);

  return httpServer;
}
