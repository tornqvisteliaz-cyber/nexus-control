/* ============================================================
   NEXUS CONTROL — Frontend Application
   Aircraft Marketplace + Newsletter + Admin Dashboard
   ============================================================ */

const API = '/api';
let state = {
  page: 'home',
  aircrafts: [],
  newsletters: [],
  adminToken: localStorage.getItem('nexus_token') || null,
  adminView: 'dashboard',
  selectedAircraft: null,
  stats: null,
  orders: [],
  subscribers: []
};

// ---------- Helpers ----------
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function formatPrice(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  $('#toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.adminToken) headers['Authorization'] = `Bearer ${state.adminToken}`;
  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ---------- Navigation ----------
function navigate(page, data = null) {
  state.page = page;
  if (data) state.selectedAircraft = data;
  $$('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
  render();
  window.scrollTo(0, 0);
  // Close mobile menu
  $('#nav-links')?.classList.remove('open');
}

// ---------- Render ----------
function render() {
  const main = $('#main-content');
  switch (state.page) {
    case 'home': main.innerHTML = renderHome(); break;
    case 'aircrafts': main.innerHTML = renderAircrafts(); break;
    case 'detail': main.innerHTML = renderDetail(); break;
    case 'trailers': main.innerHTML = renderTrailers(); break;
    case 'newsletter': main.innerHTML = renderNewsletter(); break;
    case 'admin': main.innerHTML = renderAdmin(); break;
    case 'order': main.innerHTML = renderOrderForm(); break;
    default: main.innerHTML = renderHome();
  }
  bindEvents();
}

// ---------- HOME ----------
function renderHome() {
  const featured = state.aircrafts.slice(0, 3);
  return `
    <section class="hero">
      <h1>Own the Sky</h1>
      <p>Discover premium aircraft from private jets to trainers. Explore, watch trailers, and place your order through Nexus Control.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" onclick="navigate('aircrafts')">Browse Aircraft</button>
        <button class="btn btn-secondary" onclick="navigate('trailers')">Watch Trailers</button>
      </div>
    </section>

    <div class="section-header">
      <h2>Featured <span>Aircraft</span></h2>
      <button class="btn btn-secondary btn-sm" onclick="navigate('aircrafts')">View All →</button>
    </div>
    <div class="grid grid-3">
      ${featured.length ? featured.map(acCard).join('') : '<div class="loading-center"><div class="spinner"></div></div>'}
    </div>

    <div style="margin-top:3rem" class="section-header">
      <h2>Latest <span>Newsletters</span></h2>
      <button class="btn btn-secondary btn-sm" onclick="navigate('newsletter')">Read All →</button>
    </div>
    <div>
      ${state.newsletters.slice(0, 2).map(nl => `
        <div class="nl-item">
          <h3>${esc(nl.title)}</h3>
          <div class="nl-meta">${formatDate(nl.date)} · ${esc(nl.author)}</div>
          <p>${esc(nl.content.slice(0, 160))}...</p>
        </div>
      `).join('') || '<p class="empty-state">No newsletters yet.</p>'}
    </div>
  `;
}

function acCard(ac) {
  return `
    <div class="card" onclick="navigate('detail', '${ac.id}')" style="cursor:pointer">
      <img class="card-img" src="${esc(ac.image)}" alt="${esc(ac.name)}" loading="lazy"
           onerror="this.src='https://images.unsplash.com/photo-1540962351504-030cfe4f3f1b?w=800'" />
      <div class="card-body">
        <div style="display:flex;justify-content:space-between;align-items:start">
          <div class="card-title">${esc(ac.name)}</div>
          <span class="badge badge-${ac.status}">${ac.status}</span>
        </div>
        <div class="card-meta">${esc(ac.model)} · ${esc(ac.category)}</div>
        <div class="card-desc">${esc(ac.description)}</div>
        <div class="card-price">${formatPrice(ac.price)}</div>
      </div>
    </div>
  `;
}

// ---------- AIRCRAFT LIST ----------
function renderAircrafts() {
  return `
    <div class="section-header">
      <h2>All <span>Aircraft</span></h2>
      <span style="color:var(--text-muted)">${state.aircrafts.length} available</span>
    </div>
    <div class="grid grid-3">
      ${state.aircrafts.map(acCard).join('') || '<div class="empty-state"><div class="icon">✈</div>No aircraft listed yet.</div>'}
    </div>
  `;
}

// ---------- DETAIL ----------
function renderDetail() {
  const ac = state.aircrafts.find(a => a.id === state.selectedAircraft);
  if (!ac) return `<div class="empty-state"><div class="icon">✈</div>Aircraft not found.<br><br><button class="btn btn-primary" onclick="navigate('aircrafts')">Back</button></div>`;

  return `
    <button class="btn btn-secondary btn-sm" onclick="navigate('aircrafts')" style="margin-bottom:1.5rem">← Back to Aircraft</button>
    <div class="detail-layout">
      <div>
        <img class="detail-img" src="${esc(ac.image)}" alt="${esc(ac.name)}"
             onerror="this.src='https://images.unsplash.com/photo-1540962351504-030cfe4f3f1b?w=800'" />
        ${ac.trailerUrl ? `
          <div style="margin-top:1.5rem">
            <h3 style="margin-bottom:0.8rem;font-family:var(--font-display)">Trailer</h3>
            <div class="trailer-card">
              <iframe src="${esc(ac.trailerUrl)}" allowfullscreen loading="lazy"></iframe>
            </div>
          </div>
        ` : ''}
      </div>
      <div class="detail-info">
        <span class="badge badge-${ac.status}">${ac.status}</span>
        <h1>${esc(ac.name)}</h1>
        <div class="card-meta" style="margin-bottom:1rem">${esc(ac.model)} · ${esc(ac.category)}</div>
        <div class="card-price" style="font-size:1.8rem;margin-bottom:1rem">${formatPrice(ac.price)}</div>
        <p style="color:var(--text-muted);margin-bottom:1.5rem">${esc(ac.description)}</p>
        <div class="specs-grid">
          <div class="spec-item"><div class="spec-label">Range</div><div class="spec-value">${esc(ac.specs?.range || '—')}</div></div>
          <div class="spec-item"><div class="spec-label">Seats</div><div class="spec-value">${ac.specs?.seats || '—'}</div></div>
          <div class="spec-item"><div class="spec-label">Speed</div><div class="spec-value">${esc(ac.specs?.speed || '—')}</div></div>
          <div class="spec-item"><div class="spec-label">Year</div><div class="spec-value">${ac.specs?.year || '—'}</div></div>
        </div>
        ${ac.status === 'available' ? `
          <button class="btn btn-gold btn-block" style="margin-top:1rem" onclick="navigate('order', '${ac.id}')">
            ✈ Place Order
          </button>
        ` : `<button class="btn btn-secondary btn-block" disabled>Not Available</button>`}
      </div>
    </div>
  `;
}

// ---------- ORDER FORM ----------
function renderOrderForm() {
  const ac = state.aircrafts.find(a => a.id === state.selectedAircraft);
  if (!ac) return `<div class="empty-state">Aircraft not found.</div>`;

  return `
    <button class="btn btn-secondary btn-sm" onclick="navigate('detail', '${ac.id}')" style="margin-bottom:1.5rem">← Back</button>
    <div style="max-width:560px;margin:0 auto">
      <h2 style="font-family:var(--font-display);margin-bottom:0.5rem">Place Order</h2>
      <p style="color:var(--text-muted);margin-bottom:1.5rem">
        Ordering: <strong>${esc(ac.name)}</strong> — ${formatPrice(ac.price)}
      </p>
      <form id="order-form">
        <div class="form-group">
          <label>Full Name *</label>
          <input class="form-control" name="customerName" required placeholder="Your full name" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Email *</label>
            <input class="form-control" name="email" type="email" required placeholder="you@email.com" />
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input class="form-control" name="phone" placeholder="+1-555-0000" />
          </div>
        </div>
        <div class="form-group">
          <label>Delivery / Hangar Address</label>
          <textarea class="form-control" name="address" placeholder="Full address"></textarea>
        </div>
        <div class="form-group">
          <label>Payment Method</label>
          <select class="form-control" name="paymentMethod">
            <option>Bank Transfer</option>
            <option>Wire Transfer</option>
            <option>Letter of Credit</option>
            <option>Financing</option>
          </select>
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea class="form-control" name="notes" placeholder="Any special requests..."></textarea>
        </div>
        <button type="submit" class="btn btn-gold btn-block">Confirm Order — ${formatPrice(ac.price)}</button>
      </form>
      <p style="font-size:0.8rem;color:var(--text-muted);margin-top:1rem;text-align:center">
        This is a demo. No real payment will be processed.
      </p>
    </div>
  `;
}

// ---------- TRAILERS ----------
function renderTrailers() {
  const withTrailer = state.aircrafts.filter(a => a.trailerUrl);
  return `
    <div class="section-header">
      <h2>Aircraft <span>Trailers</span></h2>
    </div>
    <div class="grid grid-2">
      ${withTrailer.map(ac => `
        <div class="card">
          <div class="trailer-card">
            <iframe src="${esc(ac.trailerUrl)}" allowfullscreen loading="lazy" title="${esc(ac.name)} trailer"></iframe>
          </div>
          <div class="trailer-info">
            <div class="card-title">${esc(ac.name)}</div>
            <div class="card-meta">${esc(ac.model)} · ${formatPrice(ac.price)}</div>
            <button class="btn btn-secondary btn-sm" style="margin-top:0.6rem" onclick="navigate('detail', '${ac.id}')">View Details</button>
          </div>
        </div>
      `).join('') || '<div class="empty-state"><div class="icon">▶</div>No trailers available yet.</div>'}
    </div>
  `;
}

// ---------- NEWSLETTER ----------
function renderNewsletter() {
  return `
    <div class="section-header">
      <h2>Nexus <span>Newsletter</span></h2>
    </div>

    <div class="card" style="padding:1.5rem;margin-bottom:2rem">
      <h3 style="margin-bottom:0.8rem">Subscribe for updates</h3>
      <p style="color:var(--text-muted);margin-bottom:1rem;font-size:0.95rem">Get the latest aircraft arrivals, exclusive offers, and aviation news.</p>
      <form id="subscribe-form" style="display:flex;gap:0.8rem;flex-wrap:wrap">
        <input class="form-control" name="name" placeholder="Your name" style="flex:1;min-width:140px" />
        <input class="form-control" name="email" type="email" required placeholder="Email address" style="flex:2;min-width:200px" />
        <button type="submit" class="btn btn-primary">Subscribe</button>
      </form>
    </div>

    <h3 style="margin-bottom:1rem;font-family:var(--font-display)">Past Issues</h3>
    ${state.newsletters.map(nl => `
      <div class="nl-item">
        <h3>${esc(nl.title)}</h3>
        <div class="nl-meta">${formatDate(nl.date)} · by ${esc(nl.author)}</div>
        <p style="white-space:pre-wrap">${esc(nl.content)}</p>
      </div>
    `).join('') || '<div class="empty-state">No newsletters published yet.</div>'}
  `;
}

// ---------- ADMIN ----------
function renderAdmin() {
  if (!state.adminToken) return renderLogin();

  return `
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <div class="admin-nav-item ${state.adminView === 'dashboard' ? 'active' : ''}" data-view="dashboard">📊 Dashboard</div>
        <div class="admin-nav-item ${state.adminView === 'aircrafts' ? 'active' : ''}" data-view="aircrafts">✈ Aircraft</div>
        <div class="admin-nav-item ${state.adminView === 'orders' ? 'active' : ''}" data-view="orders">📦 Orders</div>
        <div class="admin-nav-item ${state.adminView === 'newsletters' ? 'active' : ''}" data-view="newsletters">📰 Newsletters</div>
        <div class="admin-nav-item ${state.adminView === 'subscribers' ? 'active' : ''}" data-view="subscribers">✉ Subscribers</div>
        <div style="border-top:1px solid var(--border);margin:0.8rem 0"></div>
        <div class="admin-nav-item" id="logout-btn">🚪 Logout</div>
      </aside>
      <div class="admin-content" id="admin-panel">
        ${renderAdminView()}
      </div>
    </div>
  `;
}

function renderLogin() {
  return `
    <div class="login-box">
      <h2>Admin Login</h2>
      <p>Nexus Control Panel</p>
      <form id="login-form">
        <div class="form-group">
          <label>Username</label>
          <input class="form-control" name="username" required autocomplete="username" placeholder="admin" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input class="form-control" name="password" type="password" required autocomplete="current-password" placeholder="••••••••" />
        </div>
        <button type="submit" class="btn btn-primary btn-block">Sign In</button>
      </form>
      <p style="margin-top:1.5rem;font-size:0.8rem;color:var(--text-muted)">
        Demo credentials: <code>admin</code> / <code>nexuscontrol</code>
      </p>
    </div>
  `;
}

function renderAdminView() {
  switch (state.adminView) {
    case 'dashboard': return renderAdminDashboard();
    case 'aircrafts': return renderAdminAircrafts();
    case 'orders': return renderAdminOrders();
    case 'newsletters': return renderAdminNewsletters();
    case 'subscribers': return renderAdminSubscribers();
    default: return renderAdminDashboard();
  }
}

function renderAdminDashboard() {
  const s = state.stats || {};
  return `
    <h2 style="font-family:var(--font-display);margin-bottom:1.5rem">Dashboard</h2>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${s.totalAircrafts ?? '—'}</div><div class="stat-label">Aircraft</div></div>
      <div class="stat-card"><div class="stat-value">${s.availableAircrafts ?? '—'}</div><div class="stat-label">Available</div></div>
      <div class="stat-card"><div class="stat-value">${s.totalOrders ?? '—'}</div><div class="stat-label">Orders</div></div>
      <div class="stat-card"><div class="stat-value">${s.pendingOrders ?? '—'}</div><div class="stat-label">Pending</div></div>
      <div class="stat-card"><div class="stat-value">${s.totalNewsletters ?? '—'}</div><div class="stat-label">Newsletters</div></div>
      <div class="stat-card"><div class="stat-value">${s.totalSubscribers ?? '—'}</div><div class="stat-label">Subscribers</div></div>
    </div>
    <div class="stat-card" style="text-align:left;padding:1.5rem">
      <div class="stat-label">Total Revenue (all orders)</div>
      <div class="stat-value" style="font-size:2rem;margin-top:0.3rem">${formatPrice(s.revenue || 0)}</div>
    </div>
  `;
}

function renderAdminAircrafts() {
  return `
    <div class="section-header">
      <h2 style="font-family:var(--font-display)">Manage Aircraft</h2>
      <button class="btn btn-primary btn-sm" id="btn-add-aircraft">+ Add Aircraft</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Name</th><th>Model</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${state.aircrafts.map(ac => `
            <tr>
              <td><strong>${esc(ac.name)}</strong></td>
              <td>${esc(ac.model)}</td>
              <td>${esc(ac.category)}</td>
              <td>${formatPrice(ac.price)}</td>
              <td><span class="badge badge-${ac.status}">${ac.status}</span></td>
              <td>
                <button class="btn btn-secondary btn-sm btn-edit-ac" data-id="${ac.id}">Edit</button>
                <button class="btn btn-danger btn-sm btn-del-ac" data-id="${ac.id}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderAdminOrders() {
  return `
    <h2 style="font-family:var(--font-display);margin-bottom:1.5rem">Orders</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>ID</th><th>Aircraft</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${(state.orders || []).map(o => `
            <tr>
              <td style="font-size:0.8rem">${o.id}</td>
              <td>${esc(o.aircraftName)}</td>
              <td>${esc(o.customerName)}<br><small style="color:var(--text-muted)">${esc(o.email)}</small></td>
              <td>${formatPrice(o.total)}</td>
              <td><span class="badge badge-${o.status}">${o.status}</span></td>
              <td>${formatDate(o.date)}</td>
              <td>
                <select class="form-control order-status" data-id="${o.id}" style="padding:0.3rem;font-size:0.8rem;width:auto">
                  ${['pending','confirmed','shipped','delivered','cancelled'].map(s =>
                    `<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`
                  ).join('')}
                </select>
              </td>
            </tr>
          `).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No orders yet</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function renderAdminNewsletters() {
  return `
    <div class="section-header">
      <h2 style="font-family:var(--font-display)">Newsletters</h2>
      <button class="btn btn-primary btn-sm" id="btn-add-nl">+ Post Newsletter</button>
    </div>
    ${(state.newsletters || []).map(nl => `
      <div class="nl-item" style="display:flex;justify-content:space-between;align-items:start;gap:1rem">
        <div>
          <h3>${esc(nl.title)}</h3>
          <div class="nl-meta">${formatDate(nl.date)} · ${esc(nl.author)}</div>
          <p>${esc(nl.content.slice(0, 120))}...</p>
        </div>
        <button class="btn btn-danger btn-sm btn-del-nl" data-id="${nl.id}">Delete</button>
      </div>
    `).join('') || '<div class="empty-state">No newsletters yet. Post one!</div>'}
  `;
}

function renderAdminSubscribers() {
  return `
    <h2 style="font-family:var(--font-display);margin-bottom:1.5rem">Subscribers (${(state.subscribers||[]).length})</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Email</th><th>Name</th><th>Subscribed</th></tr></thead>
        <tbody>
          ${(state.subscribers || []).map(s => `
            <tr>
              <td>${esc(s.email)}</td>
              <td>${esc(s.name || '—')}</td>
              <td>${formatDate(s.date)}</td>
            </tr>
          `).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">No subscribers yet</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

// ---------- MODALS ----------
function showModal(html) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function closeModal() {
  $('#modal-overlay')?.remove();
}

function aircraftForm(ac = null) {
  const isEdit = !!ac;
  showModal(`
    <h3>${isEdit ? 'Edit' : 'Add'} Aircraft</h3>
    <form id="ac-form">
      <div class="form-row">
        <div class="form-group"><label>Name *</label><input class="form-control" name="name" required value="${esc(ac?.name||'')}" /></div>
        <div class="form-group"><label>Model</label><input class="form-control" name="model" value="${esc(ac?.model||'')}" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Price (USD) *</label><input class="form-control" name="price" type="number" required value="${ac?.price||''}" /></div>
        <div class="form-group"><label>Category</label>
          <select class="form-control" name="category">
            ${['Private Jet','Luxury Jet','Trainer','Cargo','Helicopter','Other'].map(c =>
              `<option ${ac?.category===c?'selected':''}>${c}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div class="form-group"><label>Description</label><textarea class="form-control" name="description">${esc(ac?.description||'')}</textarea></div>
      <div class="form-group"><label>Image URL</label><input class="form-control" name="image" value="${esc(ac?.image||'')}" placeholder="https://..." /></div>
      <div class="form-group"><label>Trailer URL (YouTube embed)</label><input class="form-control" name="trailerUrl" value="${esc(ac?.trailerUrl||'')}" placeholder="https://www.youtube.com/embed/..." /></div>
      <div class="form-row">
        <div class="form-group"><label>Range</label><input class="form-control" name="range" value="${esc(ac?.specs?.range||'')}" /></div>
        <div class="form-group"><label>Seats</label><input class="form-control" name="seats" type="number" value="${ac?.specs?.seats||''}" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Speed</label><input class="form-control" name="speed" value="${esc(ac?.specs?.speed||'')}" /></div>
        <div class="form-group"><label>Year</label><input class="form-control" name="year" type="number" value="${ac?.specs?.year||''}" /></div>
      </div>
      <div class="form-group"><label>Status</label>
        <select class="form-control" name="status">
          ${['available','reserved','sold'].map(s => `<option ${ac?.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Aircraft'}</button>
      </div>
    </form>
  `);

  $('#ac-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      name: fd.get('name'),
      model: fd.get('model'),
      price: Number(fd.get('price')),
      category: fd.get('category'),
      description: fd.get('description'),
      image: fd.get('image'),
      trailerUrl: fd.get('trailerUrl'),
      status: fd.get('status'),
      specs: {
        range: fd.get('range'),
        seats: Number(fd.get('seats')) || 0,
        speed: fd.get('speed'),
        year: Number(fd.get('year')) || new Date().getFullYear()
      }
    };
    try {
      if (isEdit) {
        await api(`/admin/aircrafts/${ac.id}`, { method: 'PUT', body: JSON.stringify(body) });
        toast('Aircraft updated');
      } else {
        await api('/admin/aircrafts', { method: 'POST', body: JSON.stringify(body) });
        toast('Aircraft added');
      }
      closeModal();
      await loadData();
      render();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

function newsletterForm() {
  showModal(`
    <h3>Post Newsletter</h3>
    <form id="nl-form">
      <div class="form-group"><label>Title *</label><input class="form-control" name="title" required /></div>
      <div class="form-group"><label>Content *</label><textarea class="form-control" name="content" required style="min-height:180px"></textarea></div>
      <div class="form-group"><label>Author</label><input class="form-control" name="author" value="Nexus Team" /></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Publish</button>
      </div>
    </form>
  `);

  $('#nl-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('/admin/newsletters', {
        method: 'POST',
        body: JSON.stringify({ title: fd.get('title'), content: fd.get('content'), author: fd.get('author') })
      });
      toast('Newsletter published!');
      closeModal();
      await loadData();
      render();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

// ---------- Events ----------
function bindEvents() {
  // Nav links
  $$('.nav-link').forEach(link => {
    link.onclick = e => {
      e.preventDefault();
      navigate(link.dataset.page);
    };
  });

  // Mobile toggle
  $('#nav-toggle')?.addEventListener('click', () => {
    $('#nav-links').classList.toggle('open');
  });

  // Order form
  $('#order-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          aircraftId: state.selectedAircraft,
          customerName: fd.get('customerName'),
          email: fd.get('email'),
          phone: fd.get('phone'),
          address: fd.get('address'),
          paymentMethod: fd.get('paymentMethod'),
          notes: fd.get('notes')
        })
      });
      toast('Order placed successfully! We will contact you soon.');
      navigate('aircrafts');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // Subscribe form
  $('#subscribe-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await api('/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: fd.get('email'), name: fd.get('name') })
      });
      toast(res.message);
      e.target.reset();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // Login form
  $('#login-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await api('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username: fd.get('username'), password: fd.get('password') })
      });
      state.adminToken = res.token;
      localStorage.setItem('nexus_token', res.token);
      toast('Welcome, Admin!');
      await loadAdminData();
      render();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // Admin sidebar
  $$('.admin-nav-item[data-view]').forEach(item => {
    item.onclick = async () => {
      state.adminView = item.dataset.view;
      if (['orders', 'subscribers', 'dashboard'].includes(state.adminView)) {
        await loadAdminData();
      }
      render();
    };
  });

  // Logout
  $('#logout-btn')?.addEventListener('click', async () => {
    try { await api('/admin/logout', { method: 'POST' }); } catch {}
    state.adminToken = null;
    localStorage.removeItem('nexus_token');
    toast('Logged out');
    render();
  });

  // Add aircraft
  $('#btn-add-aircraft')?.addEventListener('click', () => aircraftForm());

  // Edit / Delete aircraft
  $$('.btn-edit-ac').forEach(btn => {
    btn.onclick = () => {
      const ac = state.aircrafts.find(a => a.id === btn.dataset.id);
      if (ac) aircraftForm(ac);
    };
  });
  $$('.btn-del-ac').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Delete this aircraft?')) return;
      try {
        await api(`/admin/aircrafts/${btn.dataset.id}`, { method: 'DELETE' });
        toast('Aircraft deleted');
        await loadData();
        render();
      } catch (err) { toast(err.message, 'error'); }
    };
  });

  // Order status change
  $$('.order-status').forEach(sel => {
    sel.onchange = async () => {
      try {
        await api(`/admin/orders/${sel.dataset.id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: sel.value })
        });
        toast('Order status updated');
        await loadAdminData();
        render();
      } catch (err) { toast(err.message, 'error'); }
    };
  });

  // Newsletter
  $('#btn-add-nl')?.addEventListener('click', newsletterForm);
  $$('.btn-del-nl').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Delete this newsletter?')) return;
      try {
        await api(`/admin/newsletters/${btn.dataset.id}`, { method: 'DELETE' });
        toast('Newsletter deleted');
        await loadData();
        render();
      } catch (err) { toast(err.message, 'error'); }
    };
  });
}

// Escape HTML
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------- Data Loading ----------
async function loadData() {
  try {
    const [aircrafts, newsletters] = await Promise.all([
      api('/aircrafts'),
      api('/newsletters')
    ]);
    state.aircrafts = aircrafts;
    state.newsletters = newsletters;
  } catch (e) {
    console.error('Load error', e);
    toast('Failed to load data. Is the server running?', 'error');
  }
}

async function loadAdminData() {
  if (!state.adminToken) return;
  try {
    const [stats, orders, subscribers] = await Promise.all([
      api('/admin/stats'),
      api('/admin/orders'),
      api('/admin/subscribers')
    ]);
    state.stats = stats;
    state.orders = orders;
    state.subscribers = subscribers;
  } catch (e) {
    if (e.message.includes('Unauthorized')) {
      state.adminToken = null;
      localStorage.removeItem('nexus_token');
    }
    console.error(e);
  }
}

// ---------- Init ----------
async function init() {
  await loadData();
  if (state.adminToken) await loadAdminData();
  render();
}

init();
