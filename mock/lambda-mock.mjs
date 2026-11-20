import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';

/**
 * Mock local del web service Lambda de SICA 2.0.
 *
 * Simula el contrato real:
 *   - code=""  -> devuelve { s:"OK", d:{ tipo:"url_login", data:{ url_login, redirect_uri } } }
 *   - code!="" -> devuelve { s:"OK", d:{ email }, m:"..." }
 *
 * Además sirve /mock/google, una pantalla que imita el selector de cuentas de
 * Google para poder probar el ciclo completo del navegador sin backend real.
 *
 * Uso: npm run mock
 * Variables opcionales:
 *   MOCK_PORT=4000
 *   MOCK_REDIRECT_URI=http://localhost:5173/auth/callback
 *   MOCK_EMAIL=admin@test.com
 *   MOCK_DELAY_MS=650
 */

const PORT = Number(process.env.MOCK_PORT || 4000);
const DEFAULT_REDIRECT_URI =
  process.env.MOCK_REDIRECT_URI || 'http://localhost:5173/auth/callback';
const DEMO_EMAIL = process.env.MOCK_EMAIL || 'admin@test.com';
const DELAY_MS = Number(process.env.MOCK_DELAY_MS || 650);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, X-Api-Key',
  'Access-Control-Max-Age': '86400',
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function send(res, status, contentType, body) {
  res.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-store', ...CORS_HEADERS });
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, 'application/json; charset=utf-8', JSON.stringify(payload));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error('Body demasiado grande'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function collectParams(req, url) {
  const params = Object.fromEntries(url.searchParams.entries());

  if (req.method !== 'POST') return params;

  const raw = await readBody(req);
  const contentType = String(req.headers['content-type'] || '').toLowerCase();

  if (contentType.includes('application/json')) {
    try {
      Object.assign(params, JSON.parse(raw));
    } catch {
      /* body JSON inválido: se ignora */
    }
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    new URLSearchParams(raw).forEach((value, key) => {
      params[key] = value;
    });
  }

  return params;
}

function safeRedirectUri(value) {
  try {
    const parsed = new URL(String(value || DEFAULT_REDIRECT_URI));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return DEFAULT_REDIRECT_URI;
    }
    return parsed.toString();
  } catch {
    return DEFAULT_REDIRECT_URI;
  }
}

function baseUrlOf(req) {
  return `http://${req.headers.host || `localhost:${PORT}`}`;
}

function googlePage({ redirectUri, state, baseUrl }) {
  const code = `mock_code_${randomBytes(12).toString('hex')}`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Iniciar sesión: cuentas de Google (simulación)</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #f0f4f9; color: #1f1f1f;
    font-family: Roboto, Arial, "Helvetica Neue", sans-serif;
    padding: 24px;
  }
  .wrap { width: 100%; max-width: 430px; }
  .sim-banner {
    background: #fff3cd; border: 1px solid #f0c36d; color: #7a5300;
    padding: 8px 12px; border-radius: 8px; font-size: 12px; text-align: center;
    margin-bottom: 14px; font-weight: 500; letter-spacing: .3px;
  }
  .card {
    background: #fff; border: 1px solid #dadce0; border-radius: 24px;
    padding: 34px 32px 26px;
  }
  .g { font-size: 22px; font-weight: 500; letter-spacing: -.5px; margin-bottom: 16px; }
  .g span:nth-child(1) { color: #4285f4; }
  .g span:nth-child(2) { color: #ea4335; }
  .g span:nth-child(3) { color: #fbbc05; }
  .g span:nth-child(4) { color: #4285f4; }
  .g span:nth-child(5) { color: #34a853; }
  .g span:nth-child(6) { color: #ea4335; }
  h1 { font-size: 22px; font-weight: 400; margin: 0 0 6px; }
  .sub { font-size: 14px; color: #444; margin: 0 0 24px; }
  .account {
    display: flex; align-items: center; gap: 12px; width: 100%;
    padding: 12px 10px; border: 1px solid transparent; border-radius: 10px;
    background: transparent; cursor: pointer; text-align: left;
    font: inherit; color: inherit;
  }
  .account:hover { background: #f5f8fd; border-color: #dbe4f0; }
  .avatar {
    width: 38px; height: 38px; border-radius: 50%; flex: 0 0 auto;
    background: #1a73e8; color: #fff; display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 500;
  }
  .account .who { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .account .name { font-size: 14px; font-weight: 500; }
  .account .email { font-size: 13px; color: #5f6368; overflow: hidden; text-overflow: ellipsis; }
  .hint { font-size: 12.5px; color: #5f6368; line-height: 1.55; margin: 20px 0 0; }
  .actions { display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-top: 20px; }
  .deny {
    background: transparent; border: 0; color: #1a73e8; font: inherit; font-size: 14px;
    font-weight: 500; padding: 9px 12px; border-radius: 18px; cursor: pointer;
  }
  .deny:hover { background: #f0f4ff; }
  details {
    margin-top: 18px; font-size: 11.5px; color: #5f6368; background: #f8f9fa;
    border: 1px solid #e4e6ea; border-radius: 8px; padding: 10px 12px;
  }
  details summary { cursor: pointer; font-weight: 500; }
  code { display: block; margin-top: 6px; font-size: 10.5px; word-break: break-all; color: #333; }
  .foot { text-align: center; font-size: 11px; color: #6b7280; margin-top: 18px; line-height: 1.6; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="sim-banner">SIMULACIÓN LOCAL · Esta pantalla no es de Google</div>

    <div class="card">
      <div class="g" aria-hidden="true"><span>G</span><span>o</span><span>o</span><span>g</span><span>l</span><span>e</span></div>
      <h1>Elige una cuenta</h1>
      <p class="sub">para continuar a <strong>SICA 2.0</strong></p>

      <form method="get" action="${escapeHtml(redirectUri)}">
        <input type="hidden" name="code" value="${escapeHtml(code)}">
        <input type="hidden" name="state" value="${escapeHtml(state)}">
        <button class="account" type="submit">
          <span class="avatar" aria-hidden="true">${escapeHtml(DEMO_EMAIL.charAt(0).toUpperCase())}</span>
          <span class="who">
            <span class="name">Cuenta de prueba</span>
            <span class="email">${escapeHtml(DEMO_EMAIL)}</span>
          </span>
        </button>
      </form>

      <p class="hint">
        Al continuar, el mock redirigirá a la URI local con un código de un solo uso,
        igual que lo haría Google.
      </p>

      <div class="actions">
        <form method="get" action="${escapeHtml(redirectUri)}">
          <input type="hidden" name="error" value="access_denied">
          <input type="hidden" name="state" value="${escapeHtml(state)}">
          <button class="deny" type="submit">Cancelar</button>
        </form>
      </div>

      <details>
        <summary>Datos de la simulación</summary>
        <code>redirect_uri: ${escapeHtml(redirectUri)}</code>
        <code>state: ${escapeHtml(state)}</code>
        <code>code: ${escapeHtml(code)}</code>
        <code>scope: openid email profile</code>
      </details>
    </div>

    <p class="foot">
      Mock de <strong>${escapeHtml(baseUrl)}</strong> · El email que devolverá el Lambda será
      ${escapeHtml(DEMO_EMAIL)}.
    </p>
  </div>
</body>
</html>`;
}

function infoPage(baseUrl) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mock Lambda · SICA 2.0</title>
<style>
  body { margin:0; padding:40px 20px; font-family: Roboto, Arial, sans-serif; background:#f7f8fa; color:#222; }
  main { max-width: 660px; margin: 0 auto; background:#fff; border:1px solid #ddd; padding:28px 32px; }
  h1 { font-size:22px; margin:0 0 6px; }
  p { font-size:14px; line-height:1.6; color:#444; }
  code { background:#f2f3f5; border:1px solid #e2e4e8; padding:2px 5px; border-radius:3px; font-size:12.5px; }
  ul { font-size:13.5px; line-height:2; }
  .ok { color:#1b5e20; font-weight:600; }
  pre { background:#20242c; color:#e9edf5; padding:14px 16px; overflow:auto; font-size:12px; line-height:1.5; }
  a { color:#1a4fd0; }
</style>
</head>
<body>
<main>
  <h1>Mock Lambda · SICA 2.0</h1>
  <p><span class="ok">● Activo</span> en <code>${escapeHtml(baseUrl)}</code></p>
  <p>Endpoint de login (acepta GET y POST en cualquier ruta):</p>
  <pre>${escapeHtml(baseUrl)}/dev?code=

// code vacío
{ "s": "OK", "d": { "tipo": "url_login", "data": { "url_login": "...", "redirect_uri": "..." } }, "m": "..." }

// code con valor
{ "s": "OK", "d": { "email": "${escapeHtml(DEMO_EMAIL)}" }, "m": "..." }</pre>
  <ul>
    <li><a href="${escapeHtml(baseUrl)}/health">/health</a> · estado del mock</li>
    <li><a href="${escapeHtml(baseUrl)}/dev?code=">/dev?code=</a> · primer paso del flujo</li>
    <li><a href="${escapeHtml(baseUrl)}/dev?code=mock_code_demo">/dev?code=mock_code_demo</a> · segundo paso del flujo</li>
  </ul>
  <p>El frontend está en <a href="http://localhost:5173">http://localhost:5173</a>.</p>
</main>
</body>
</html>`;
}

const server = createServer(async (req, res) => {
  const startedAt = Date.now();
  const url = new URL(req.url || '/', baseUrlOf(req));

  res.on('finish', () => {
    console.log(
      `[mock] ${req.method} ${url.pathname}${url.search ? `?${url.searchParams.toString()}` : ''} → ${res.statusCode} (${Date.now() - startedAt} ms)`,
    );
  });

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  try {
    if (req.method === 'GET' && url.pathname === '/favicon.ico') {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { s: 'OK', d: { service: 'sica-lambda-mock', email: DEMO_EMAIL } });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/') {
      send(res, 200, 'text/html; charset=utf-8', infoPage(baseUrlOf(req)));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/mock/google') {
      const redirectUri = safeRedirectUri(url.searchParams.get('redirect_uri'));
      const state = url.searchParams.get('state') || randomBytes(16).toString('hex');
      send(
        res,
        200,
        'text/html; charset=utf-8',
        googlePage({ redirectUri, state, baseUrl: baseUrlOf(req) }),
      );
      return;
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
      sendJson(res, 405, { s: 'ERROR', d: null, m: 'Método no permitido' });
      return;
    }

    const params = await collectParams(req, url);
    const code = params.code === undefined || params.code === null ? '' : String(params.code);

    if (!code.trim()) {
      const redirectUri = safeRedirectUri(params.redirect_uri);
      const state =
        typeof params.state === 'string' && params.state
          ? params.state
          : randomBytes(16).toString('hex');

      const loginUrl = new URL('/mock/google', baseUrlOf(req));
      loginUrl.searchParams.set('redirect_uri', redirectUri);
      loginUrl.searchParams.set('state', state);

      sendJson(res, 200, {
        s: 'OK',
        d: {
          tipo: 'url_login',
          data: {
            url_login: loginUrl.toString(),
            redirect_uri: redirectUri,
          },
        },
        m: 'url login generada correctamente',
      });
      return;
    }

    await delay(DELAY_MS);

    if (code.startsWith('mock_denied')) {
      sendJson(res, 200, {
        s: 'ERROR',
        d: null,
        m: 'El usuario canceló el consentimiento en Google (simulado).',
      });
      return;
    }

    sendJson(res, 200, {
      s: 'OK',
      d: { email: DEMO_EMAIL },
      m: 'Email obtenido correctamente',
    });
  } catch (error) {
    console.error('[mock] Error:', error);
    sendJson(res, 500, {
      s: 'ERROR',
      d: null,
      m: error instanceof Error ? error.message : 'Error interno del mock',
    });
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  Mock Lambda SICA 2.0');
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  → Login:    http://localhost:${PORT}/dev?code=`);
  console.log(`  → Google:   http://localhost:${PORT}/mock/google`);
  console.log(`  → Redirect: ${DEFAULT_REDIRECT_URI}`);
  console.log(`  → Email:    ${DEMO_EMAIL}`);
  console.log('');
  console.log('  Ctrl+C para detener.');
  console.log('');
});
