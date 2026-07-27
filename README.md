# Nexus Control

**Aircraft Marketplace · Newsletter Platform · Admin Control Center**

A full-stack demo web application where users can browse and order aircraft, watch trailers, and subscribe to newsletters. Administrators have a complete control panel to manage everything.

---

## Features

### Public Site
- **Home** — Featured aircraft & latest newsletters
- **Aircraft Catalog** — Browse all listings with details, specs, and pricing
- **Aircraft Detail** — Full description, specs, embedded trailer, and order button
- **Trailers** — Watch promotional videos for each aircraft
- **Newsletter** — Subscribe + read past issues
- **Order Form** — Place a simulated purchase order

### Admin Dashboard (`/admin`)
- Secure login
- **Dashboard** — Stats (aircraft, orders, revenue, subscribers…)
- **Aircraft Management** — Add, edit, delete aircraft (with image, trailer URL, specs)
- **Orders** — View all orders and update status (pending → confirmed → shipped → delivered)
- **Newsletters** — Post new issues and delete old ones
- **Subscribers** — View newsletter subscriber list

---

## Quick Start

### Requirements
- Node.js 18+ (uses only built-in modules — no `npm install` needed)

### Run

```bash
cd nexus-control
node server.js
```

Open your browser at: **http://localhost:3000**

### Admin Credentials
| Field    | Value          |
|----------|----------------|
| Username | `admin`        |
| Password | `nexuscontrol` |

---

## Project Structure

```
nexus-control/
├── server.js          # Backend (pure Node.js HTTP server + JSON file storage)
├── package.json
├── data/
│   ├── aircrafts.json
│   ├── orders.json
│   ├── newsletters.json
│   └── subscribers.json
└── public/
    ├── index.html
    ├── styles.css
    └── app.js         # Frontend SPA (vanilla JS)
```

---

## API Endpoints

### Public
| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| GET    | `/api/aircrafts`      | List all aircraft        |
| GET    | `/api/aircrafts/:id`  | Get one aircraft         |
| GET    | `/api/newsletters`    | List newsletters         |
| POST   | `/api/subscribe`      | Subscribe to newsletter  |
| POST   | `/api/orders`         | Place an order           |

### Admin (requires `Authorization: Bearer <token>`)
| Method | Endpoint                    | Description           |
|--------|-----------------------------|-----------------------|
| POST   | `/api/admin/login`          | Login                 |
| POST   | `/api/admin/logout`         | Logout                |
| GET    | `/api/admin/stats`          | Dashboard stats       |
| GET    | `/api/admin/orders`         | List orders           |
| PUT    | `/api/admin/orders/:id`     | Update order status   |
| POST   | `/api/admin/aircrafts`      | Create aircraft       |
| PUT    | `/api/admin/aircrafts/:id`  | Update aircraft       |
| DELETE | `/api/admin/aircrafts/:id`  | Delete aircraft       |
| POST   | `/api/admin/newsletters`    | Publish newsletter    |
| DELETE | `/api/admin/newsletters/:id`| Delete newsletter     |
| GET    | `/api/admin/subscribers`    | List subscribers      |

---

## Notes

- This is a **demo / educational** application. Orders are simulated — no real payments.
- Data is stored in local JSON files under `/data`.
- Sessions are in-memory (restarting the server logs everyone out).
- Trailer embeds use YouTube URLs. Replace with your own video embeds as needed.
- Images use Unsplash placeholders; you can change them in the admin panel.

---

## Tech Stack

- **Backend**: Node.js (built-in `http`, `fs`, `crypto`) — zero dependencies
- **Frontend**: Vanilla HTML / CSS / JavaScript (SPA)
- **Storage**: JSON files
- **UI**: Custom dark aviation-themed design

Built for **Nexus Control**.
