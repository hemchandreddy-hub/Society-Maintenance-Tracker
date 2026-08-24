# Society Maintenance Tracker

A full-stack platform for apartment societies to manage maintenance complaints. Residents can raise complaints with photos, admins manage them with priorities and status tracking, and everyone stays informed through a notice board and email notifications.

![Login](https://img.shields.io/badge/Auth-JWT-blue) ![DB](https://img.shields.io/badge/DB-SQLite-green) ![API](https://img.shields.io/badge/API-REST-orange)

## Features

- **Resident Portal**: Register, login, raise complaints with photos, track status history
- **Admin Dashboard**: Stats overview, complaint management, priority setting, overdue detection
- **Complaint Lifecycle**: Open → In Progress → Resolved, with full history recording
- **Photo Uploads**: Attach images to complaints (JPEG, PNG, WebP, max 5MB)
- **Overdue Detection**: Auto-flags complaints beyond configurable threshold (default 7 days)
- **Notice Board**: Admin posts notices, important ones pinned to top
- **Email Notifications**: Status changes and important notices via Nodemailer/Ethereal

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Database | SQLite (sql.js) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| File Upload | Multer |
| Email | Nodemailer + Ethereal |
| Frontend | React + Vite |
| Styling | Vanilla CSS |

## Prerequisites

- **Node.js** v18+ and npm

## Setup & Run

```bash
# 1. Clone and install backend dependencies
cd society-maintenance-tracker
npm install

# 2. Install frontend dependencies
cd client
npm install
cd ..

# 3. Copy environment file
cp .env.example .env
# Edit .env if needed (defaults work for development)

# 4. Start both servers (concurrent)
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api

### Running individually

```bash
npm run server   # Start backend only (port 5000)
npm run client   # Start frontend only (port 5173)
```

## Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@society.com | admin123 |
| Resident | john@resident.com | password123 |
| Resident | jane@resident.com | password123 |

## .env Configuration

```env
PORT=5000                                    # Server port
JWT_SECRET=your-secret-key-change-in-prod    # JWT signing secret
OVERDUE_DAYS=7                               # Days before complaint is auto-flagged overdue
```

## Database Schema

### users
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| name | TEXT | Full name |
| email | TEXT UNIQUE | Login email |
| password_hash | TEXT | bcrypt hash |
| role | TEXT | 'resident' or 'admin' |
| apartment_no | TEXT | Apartment number |
| created_at | DATETIME | Registration timestamp |

### complaints
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| resident_id | INTEGER FK | References users.id |
| category | TEXT | Plumbing, Electrical, Elevator, Parking, Common Area, Other |
| title | TEXT | Brief complaint title |
| description | TEXT | Detailed description |
| photo_url | TEXT | Path to uploaded photo |
| priority | TEXT | Low, Medium, High |
| status | TEXT | Open, In Progress, Resolved |
| is_overdue | INTEGER | 1 if overdue, 0 otherwise |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |
| resolved_at | DATETIME | Resolution timestamp |

### complaint_history
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| complaint_id | INTEGER FK | References complaints.id |
| old_status | TEXT | Previous status (null on creation) |
| new_status | TEXT | New status |
| changed_by | INTEGER FK | References users.id |
| note | TEXT | Optional note |
| created_at | DATETIME | Change timestamp |

### notices
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| title | TEXT | Notice title |
| content | TEXT | Notice body |
| is_important | INTEGER | 1 = pinned to top |
| posted_by | INTEGER FK | References users.id |
| created_at | DATETIME | Post timestamp |

### settings
| Column | Type | Description |
|--------|------|-------------|
| key | TEXT PK | Setting name |
| value | TEXT | Setting value |

## API Documentation

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | None | Register resident |
| POST | `/api/auth/login` | None | Login, returns JWT |
| GET | `/api/auth/me` | Token | Get current user |

### Complaints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/complaints` | Resident | Create complaint (multipart) |
| GET | `/api/complaints` | Token | List complaints (role-filtered) |
| GET | `/api/complaints/:id` | Token | Get complaint + history |
| PATCH | `/api/complaints/:id/status` | Admin | Update status + optional note |
| PATCH | `/api/complaints/:id/priority` | Admin | Set priority |
| POST | `/api/complaints/:id/overdue` | Admin | Flag as overdue |

**Query Filters** (GET /api/complaints): `category`, `status`, `priority`, `dateFrom`, `dateTo`

### Notices

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/notices` | Admin | Post notice |
| GET | `/api/notices` | Token | List notices (important first) |
| DELETE | `/api/notices/:id` | Admin | Delete notice |

### Dashboard

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dashboard` | Admin | Aggregated stats |

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | None | Server health check |

## Email Notifications

The app uses **Nodemailer with Ethereal** (free test SMTP). All emails are captured in Ethereal's web interface.

On server start, the console logs Ethereal credentials:
```
📧 Email service initialized (Ethereal Test SMTP)
   Ethereal user: xxx@ethereal.email
   Ethereal pass: xxxxx
```

Visit https://ethereal.email/login with those credentials to view sent emails.

### Switching to Real SMTP

Replace the Ethereal config in `server/services/email.js` with:
```javascript
transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: { user: 'your@gmail.com', pass: 'app-password' }
});
```

## Production Build

```bash
npm run build     # Build frontend
npm run start     # Serve everything from Express
```

## License

MIT
