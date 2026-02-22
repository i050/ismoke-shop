const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 3000;
const distDir = path.join(__dirname, 'dist');

// מיפוי MIME בסיסי לקבצים נפוצים של Vite
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8'
};

// בוחר Cache-Control לפי סוג הנתיב:
// 1) assets עם hash => immutable לשנה
// 2) index.html => ללא cache כדי לא לקבל manifest ישן אחרי deploy
// 3) שאר קבצים => cache קצר
const getCacheControl = (requestPath) => {
  if (requestPath === '/index.html' || requestPath === '/') {
    return 'no-store, no-cache, must-revalidate, max-age=0';
  }

  if (requestPath.startsWith('/assets/')) {
    return 'public, max-age=31536000, immutable';
  }

  return 'public, max-age=3600';
};

// מוודא שהנתיב נשאר בתוך dist ולא מאפשר path traversal
const resolveSafePath = (urlPath) => {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0]);
  const normalizedPath = path.normalize(decodedPath).replace(/^([.]{2}[/\\])+/, '');
  const fullPath = path.join(distDir, normalizedPath);

  if (!fullPath.startsWith(distDir)) {
    return null;
  }

  return fullPath;
};

const sendFile = (res, filePath, requestPath, statusCode = 200) => {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || 'application/octet-stream';

  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': getCacheControl(requestPath),
  });

  fs.createReadStream(filePath).pipe(res);
};

const server = http.createServer((req, res) => {
  const requestPath = req.url || '/';
  const safePath = resolveSafePath(requestPath === '/' ? '/index.html' : requestPath);

  if (!safePath) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }

  fs.stat(safePath, (error, stats) => {
    if (!error && stats.isFile()) {
      sendFile(res, safePath, requestPath);
      return;
    }

    // SPA fallback: כל נתיב שלא נמצא יטען index.html
    const indexPath = path.join(distDir, 'index.html');
    fs.stat(indexPath, (indexError, indexStats) => {
      if (indexError || !indexStats.isFile()) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('index.html not found');
        return;
      }

      sendFile(res, indexPath, '/index.html');
    });
  });
});

server.listen(PORT, () => {
  // לוג קצר לזיהוי תקין ב-Railway logs
  console.log(`Frontend static server listening on port ${PORT}`);
});
