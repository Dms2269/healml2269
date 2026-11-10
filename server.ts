import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { spawn, execSync, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ESM compatibility for __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const PYTHON_PORT = 5001;

async function startServer() {
  const app = express();

  // 1. Launch Python Flask ML Backend Process
  console.log(`Checking Python Flask ML Subsystem on port ${PYTHON_PORT}...`);
  let pythonProc: ChildProcess | null = null;
  let isShuttingDown = false;

  function launchPython() {
    if (isShuttingDown) return;
    try {
      execSync('python3 -c "import flask"', { stdio: 'ignore' });
    } catch {
      console.log('Notice: Python Flask not found in local environment. Node.js REST API gateway active.');
      return;
    }

    try {
      const cleanEnv = { ...process.env };
      if (cleanEnv.DATABASE_URL && !cleanEnv.DATABASE_URL.includes('://')) {
        console.warn(`Notice: Sanitizing invalid DATABASE_URL "${cleanEnv.DATABASE_URL}". Defaulting to SQLite database.`);
        delete cleanEnv.DATABASE_URL;
      }

      pythonProc = spawn('python3', ['backend/app.py'], {
        cwd: process.cwd(),
        env: {
          ...cleanEnv,
          FLASK_PORT: String(PYTHON_PORT),
          PYTHON_PORT: String(PYTHON_PORT),
          PORT: String(PYTHON_PORT),
          PYTHONPATH: process.cwd(),
        },
        stdio: 'inherit'
      });

      pythonProc.on('error', (err) => {
        console.warn('Notice: Python ML Subsystem process error:', err.message);
      });

      pythonProc.on('exit', (code, signal) => {
        if (!isShuttingDown && code !== 0 && code !== null) {
          console.warn(`Python ML Subsystem exited with code ${code} (${signal}). Retrying in 10s...`);
          setTimeout(launchPython, 10000);
        }
      });
    } catch (spawnErr: any) {
      console.warn('Notice: Could not spawn Python ML Subsystem process:', spawnErr.message);
    }
  }

  // Check if Python ML subsystem is already listening on 5001, otherwise launch
  fetch(`http://127.0.0.1:${PYTHON_PORT}/api/system/health`)
    .then((r) => {
      if (!r.ok) launchPython();
      else console.log('Python ML Subsystem is already active on port 5001.');
    })
    .catch(() => launchPython());

  const cleanup = () => {
    isShuttingDown = true;
    if (pythonProc && !pythonProc.killed) {
      console.log('Shutting down Python ML Subsystem...');
      try {
        pythonProc.kill();
      } catch {
        // ignore
      }
    }
  };

  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });
  process.on('exit', () => cleanup());

  app.use(express.json());

  let pythonBackendOnline = false;

  async function checkPythonHealth() {
    try {
      const r = await fetch(`http://127.0.0.1:${PYTHON_PORT}/api/system/health`);
      pythonBackendOnline = r.ok;
    } catch {
      pythonBackendOnline = false;
    }
  }

  checkPythonHealth();
  setInterval(checkPythonHealth, 4000);

  // 2. Resilient API Gateway: Proxies to Python when active, otherwise uses Node fallback
  const { fallbackApiRouter } = await import('./src/serverApiFallback');

  const apiProxy = createProxyMiddleware({
    target: `http://127.0.0.1:${PYTHON_PORT}`,
    changeOrigin: true,
    pathRewrite: (path) => (path.startsWith('/api') ? path : `/api${path}`),
    on: {
      proxyReq: (proxyReq, req: any) => {
        if (req.body && Object.keys(req.body).length) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      },
      error: (err: any, req: any, res: any) => {
        pythonBackendOnline = false;
        console.warn('Notice: Python proxy inactive, routing request to local Node.js API engine.');
        if (res && !res.headersSent) {
          fallbackApiRouter(req, res, () => {
            if (!res.headersSent) {
              res.status(404).json({ error: 'Endpoint not found' });
            }
          });
        }
      },
      proxyRes: (proxyRes, req, res) => {
        if (req.url && req.url.includes('/events')) {
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Connection', 'keep-alive');
        }
      }
    }
  });

  app.use('/api', (req, res, next) => {
    if (pythonBackendOnline) {
      return (apiProxy as any)(req, res, (err: any) => {
        if (err || !res.headersSent) {
          return fallbackApiRouter(req, res, next);
        }
        next();
      });
    }
    return fallbackApiRouter(req, res, next);
  });

  // 3. Mount Vite in Development or Static Dist in Production
  const distPath = fs.existsSync(path.resolve(process.cwd(), 'dist', 'index.html'))
    ? path.resolve(process.cwd(), 'dist')
    : path.resolve(__dirname, 'dist');

  const hasBuiltDist = fs.existsSync(path.join(distPath, 'index.html'));
  const isProduction = process.env.NODE_ENV === 'production' && hasBuiltDist;

  if (isProduction && hasBuiltDist) {
    console.log(`Serving pre-built production assets from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.log('Starting Vite in development middleware mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 HEALML Enterprise Web Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
