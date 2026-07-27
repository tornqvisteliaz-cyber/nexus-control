const http = require('http');
const fs = require('fs');
const path = require('path');

const crypto = require('crypto');

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Simple in-memory session store (admin tokens)
const sessions = new Map();

// Helper: read JSON file
function readJSON(filename) {
  try {
    const data = fs.readFileSync(path.join(DATA_DIR, filename), 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

// Helper: write JSON file
function writeJSON(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

// Helper: generate ID
function generateId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// Helper: parse body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Helper: send JSON response
function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Helper: check admin auth
function isAdmin(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  return sessions.has(token);
}

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Serve static files
function serveStatic(req, res, pathname) {
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  
  // Security: prevent path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback
      if (pathname !== '/' && !pathname.includes('.')) {
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, data2) => {
          if (err2) {
            res.writeHead(404);
            res.end('Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data2);
          }
        });
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// API Router
async function handleAPI(req, res, pathname) {
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    sendJSON(res, 200, {});
    return;
  }

  // ========== PUBLIC ROUTES ==========

  // GET /api/aircrafts
  if (pathname === '/api/aircrafts' && method === 'GET') {
    const aircrafts = readJSON('aircrafts.json');
    sendJSON(res, 200, aircrafts);
    return;
  }

  // GET /api/aircrafts/:id
  if (pathname.startsWith('/api/aircrafts/') && method === 'GET') {
    const id = pathname.split('/')[3];
    const aircrafts = readJSON('aircrafts.json');
    const ac = aircrafts.find(a => a.id === id);
    if (ac) sendJSON(res, 200, ac);
    else sendJSON(res, 404, { error: 'Aircraft not found' });
    return;
  }

  // GET /api/newsletters
  if (pathname === '/api/newsletters' && method === 'GET') {
    const newsletters = readJSON('newsletters.json');
    sendJSON(res, 200, newsletters);
    return;
  }

  // POST /api/subscribe
  if (pathname === '/api/subscribe' && method === 'POST') {
    try {
      const body = await parseBody(req);
      if (!body.email || !body.email.includes('@')) {
        sendJSON(res, 400, { error: 'Valid email required' });
        return;
      }
      const subs = readJSON('subscribers.json');
      if (subs.find(s => s.email === body.email)) {
        sendJSON(res, 200, { message: 'Already subscribed' });
        return;
      }
      subs.push({ email: body.email, name: body.name || '', date: new Date().toISOString() });
      writeJSON('subscribers.json', subs);
      sendJSON(res, 201, { message: 'Successfully subscribed to Nexus newsletter!' });
    } catch (e) {
      sendJSON(res, 400, { error: 'Invalid request' });
    }
    return;
  }

  // POST /api/orders  (place order)
  if (pathname === '/api/orders' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const { aircraftId, customerName, email, phone, address, paymentMethod, notes } = body;
      
      if (!aircraftId || !customerName || !email) {
        sendJSON(res, 400, { error: 'Missing required fields' });
        return;
      }

      const aircrafts = readJSON('aircrafts.json');
      const ac = aircrafts.find(a => a.id === aircraftId);
      if (!ac) {
        sendJSON(res, 404, { error: 'Aircraft not found' });
        return;
      }
      if (ac.status !== 'available') {
        sendJSON(res, 400, { error: 'Aircraft not available' });
        return;
      }

      const order = {
        id: generateId('ord'),
        aircraftId,
        aircraftName: ac.name,
        customerName,
        email,
        phone: phone || '',
        address: address || '',
        total: ac.price,
        status: 'pending',
        date: new Date().toISOString(),
        paymentMethod: paymentMethod || 'Bank Transfer',
        notes: notes || ''
      };

      const orders = readJSON('orders.json');
      orders.unshift(order);
      writeJSON('orders.json', orders);

      // Mark as reserved (optional - keep available for demo)
      // ac.status = 'reserved';
      // writeJSON('aircrafts.json', aircrafts);

      sendJSON(res, 201, { message: 'Order placed successfully!', order });
    } catch (e) {
      sendJSON(res, 400, { error: 'Invalid request' });
    }
    return;
  }

  // ========== ADMIN ROUTES ==========

  // POST /api/admin/login
  if (pathname === '/api/admin/login' && method === 'POST') {
    try {
      const body = await parseBody(req);
      // Default credentials: admin / nexuscontrol
      if (body.username === 'admin' && body.password === 'nexuscontrol') {
        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, { username: 'admin', loginAt: Date.now() });
        sendJSON(res, 200, { token, message: 'Login successful' });
      } else {
        sendJSON(res, 401, { error: 'Invalid credentials' });
      }
    } catch (e) {
      sendJSON(res, 400, { error: 'Invalid request' });
    }
    return;
  }

  // All other admin routes require auth
  if (pathname.startsWith('/api/admin/')) {
    if (!isAdmin(req)) {
      sendJSON(res, 401, { error: 'Unauthorized. Please login.' });
      return;
    }

    // GET /api/admin/stats
    if (pathname === '/api/admin/stats' && method === 'GET') {
      const aircrafts = readJSON('aircrafts.json');
      const orders = readJSON('orders.json');
      const newsletters = readJSON('newsletters.json');
      const subscribers = readJSON('subscribers.json');
      sendJSON(res, 200, {
        totalAircrafts: aircrafts.length,
        availableAircrafts: aircrafts.filter(a => a.status === 'available').length,
        totalOrders: orders.length,
        pendingOrders: orders.filter(o => o.status === 'pending').length,
        totalNewsletters: newsletters.length,
        totalSubscribers: subscribers.length,
        revenue: orders.reduce((sum, o) => sum + (o.total || 0), 0)
      });
      return;
    }

    // GET /api/admin/orders
    if (pathname === '/api/admin/orders' && method === 'GET') {
      const orders = readJSON('orders.json');
      sendJSON(res, 200, orders);
      return;
    }

    // PUT /api/admin/orders/:id
    if (pathname.startsWith('/api/admin/orders/') && method === 'PUT') {
      try {
        const id = pathname.split('/')[4];
        const body = await parseBody(req);
        const orders = readJSON('orders.json');
        const idx = orders.findIndex(o => o.id === id);
        if (idx === -1) {
          sendJSON(res, 404, { error: 'Order not found' });
          return;
        }
        if (body.status) orders[idx].status = body.status;
        if (body.notes !== undefined) orders[idx].notes = body.notes;
        writeJSON('orders.json', orders);
        sendJSON(res, 200, orders[idx]);
      } catch (e) {
        sendJSON(res, 400, { error: 'Invalid request' });
      }
      return;
    }

    // POST /api/admin/aircrafts  (create)
    if (pathname === '/api/admin/aircrafts' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const aircrafts = readJSON('aircrafts.json');
        const newAc = {
          id: generateId('ac'),
          name: body.name || 'Unnamed Aircraft',
          model: body.model || '',
          price: Number(body.price) || 0,
          description: body.description || '',
          image: body.image || 'https://images.unsplash.com/photo-1540962351504-030cfe4f3f1b?w=800',
          trailerUrl: body.trailerUrl || '',
          category: body.category || 'Private Jet',
          status: body.status || 'available',
          specs: body.specs || { range: '', seats: 0, speed: '', year: new Date().getFullYear() }
        };
        aircrafts.unshift(newAc);
        writeJSON('aircrafts.json', aircrafts);
        sendJSON(res, 201, newAc);
      } catch (e) {
        sendJSON(res, 400, { error: 'Invalid request' });
      }
      return;
    }

    // PUT /api/admin/aircrafts/:id
    if (pathname.startsWith('/api/admin/aircrafts/') && method === 'PUT') {
      try {
        const id = pathname.split('/')[4];
        const body = await parseBody(req);
        const aircrafts = readJSON('aircrafts.json');
        const idx = aircrafts.findIndex(a => a.id === id);
        if (idx === -1) {
          sendJSON(res, 404, { error: 'Aircraft not found' });
          return;
        }
        aircrafts[idx] = { ...aircrafts[idx], ...body, id }; // keep id
        writeJSON('aircrafts.json', aircrafts);
        sendJSON(res, 200, aircrafts[idx]);
      } catch (e) {
        sendJSON(res, 400, { error: 'Invalid request' });
      }
      return;
    }

    // DELETE /api/admin/aircrafts/:id
    if (pathname.startsWith('/api/admin/aircrafts/') && method === 'DELETE') {
      const id = pathname.split('/')[4];
      let aircrafts = readJSON('aircrafts.json');
      const before = aircrafts.length;
      aircrafts = aircrafts.filter(a => a.id !== id);
      if (aircrafts.length === before) {
        sendJSON(res, 404, { error: 'Aircraft not found' });
        return;
      }
      writeJSON('aircrafts.json', aircrafts);
      sendJSON(res, 200, { message: 'Aircraft deleted' });
      return;
    }

    // POST /api/admin/newsletters
    if (pathname === '/api/admin/newsletters' && method === 'POST') {
      try {
        const body = await parseBody(req);
        if (!body.title || !body.content) {
          sendJSON(res, 400, { error: 'Title and content required' });
          return;
        }
        const newsletters = readJSON('newsletters.json');
        const nl = {
          id: generateId('nl'),
          title: body.title,
          content: body.content,
          date: new Date().toISOString(),
          author: body.author || 'Nexus Team'
        };
        newsletters.unshift(nl);
        writeJSON('newsletters.json', newsletters);
        sendJSON(res, 201, nl);
      } catch (e) {
        sendJSON(res, 400, { error: 'Invalid request' });
      }
      return;
    }

    // DELETE /api/admin/newsletters/:id
    if (pathname.startsWith('/api/admin/newsletters/') && method === 'DELETE') {
      const id = pathname.split('/')[4];
      let newsletters = readJSON('newsletters.json');
      const before = newsletters.length;
      newsletters = newsletters.filter(n => n.id !== id);
      if (newsletters.length === before) {
        sendJSON(res, 404, { error: 'Newsletter not found' });
        return;
      }
      writeJSON('newsletters.json', newsletters);
      sendJSON(res, 200, { message: 'Newsletter deleted' });
      return;
    }

    // GET /api/admin/subscribers
    if (pathname === '/api/admin/subscribers' && method === 'GET') {
      const subs = readJSON('subscribers.json');
      sendJSON(res, 200, subs);
      return;
    }

    // Logout
    if (pathname === '/api/admin/logout' && method === 'POST') {
      const auth = req.headers.authorization || '';
      const token = auth.replace('Bearer ', '');
      sessions.delete(token);
      sendJSON(res, 200, { message: 'Logged out' });
      return;
    }
  }

  sendJSON(res, 404, { error: 'API endpoint not found' });
}

// Main server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  if (pathname.startsWith('/api/')) {
    try {
      await handleAPI(req, res, pathname);
    } catch (e) {
      console.error(e);
      sendJSON(res, 500, { error: 'Internal server error' });
    }
  } else {
    serveStatic(req, res, pathname);
  }
});

server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║         NEXUS CONTROL  v1.0                  ║
  ║   Aircraft Marketplace + Admin Dashboard     ║
  ╠══════════════════════════════════════════════╣
  ║  Server running at: http://localhost:${PORT}    ║
  ║                                              ║
  ║  Admin Login:                                ║
  ║    Username: admin                           ║
  ║    Password: nexuscontrol                    ║
  ╚══════════════════════════════════════════════╝
  `);
});
