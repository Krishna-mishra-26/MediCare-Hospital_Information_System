# 🏥 MediCare Plus - Hospital Information System

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-green.svg)](https://mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-black.svg)](https://socket.io/)

A **production-ready, full-stack Hospital Information System** designed for real-world healthcare management with modern UI/UX, real-time features, and comprehensive functionality.

![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Seed database with sample data (dummy Data)
node seeder.js

# Start the server
npm start

# Start the MongoDB
sudo net start mongoDB
mongod

# Open http://localhost:5000

```

---

## ✨ Features

### 🏥 Core Modules (All Fully Functional)

| Module | Features |
|--------|----------|
| **Patient Management** | OPD, IPD, Emergency registration with full CRUD |
| **Bed Management** | Real-time bed tracking, ward management |
| **Operation Theater** | Surgery scheduling, OT room status |
| **Laboratory** | Test ordering, results, priority handling |
| **Radiology** | X-Ray, CT, MRI, Ultrasound orders |
| **Pharmacy** | Prescription management, dispensing |
| **Billing** | Auto bill generation, payment tracking |
| **Dashboard** | Real-time KPIs and analytics |

### 🔒 Security Features

- **Helmet.js** - Secure HTTP headers
- **Rate Limiting** - DDoS protection (1000 req/15min)
- **Input Sanitization** - NoSQL injection prevention
- **JWT Authentication** - 30-day token expiry
- **RBAC** - Role-based access control

### ⚡ Performance

- **Compression** - Gzip responses
- **Database Indexes** - Optimized queries
- **Request Timeout** - 30s timeout handling
- **Static Asset Caching** - 1-year cache (production)

### 🔄 Real-Time

- **WebSocket** - Live updates via Socket.io
- **Instant Notifications** - New patients, surgeries, lab results
- **Live Dashboard** - Auto-refreshing stats

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js 18+, Express 5.x |
| **Database** | MongoDB 7.x, Mongoose 9.x |
| **Real-time** | Socket.io 4.x |
| **Security** | Helmet, JWT, bcrypt |
| **Frontend** | HTML5, CSS3, JavaScript, Chart.js |

---

## 📁 Project Structure

```
├── config/db.js           # MongoDB connection
├── controllers/           # Route handlers (auth, patients, beds, etc.)
├── models/                # Mongoose schemas with indexes
├── routes/                # Express routers
├── public/
│   ├── index.html         # Landing page
│   ├── dashboard.html     # Main dashboard
│   ├── css/               # Stylesheets
│   └── js/                # Frontend logic
├── server.js              # Express server (production-ready)
├── seeder.js              # Database seeding
└── package.json
```

---

## 🔐 API Endpoints

| Route | Description |
|-------|-------------|
| `/api/auth` | Authentication (login/register) |
| `/api/patients` | Patient CRUD operations |
| `/api/beds` | Bed & Ward Management |
| `/api/surgeries` | Surgery Scheduling |
| `/api/labs` | Lab Tests |
| `/api/imaging` | Radiology Orders |
| `/api/prescriptions` | Pharmacy |
| `/api/bills` | Billing |
| `/api/dashboard/stats` | Dashboard Statistics |
| `/api/health` | Health Check |

---

## 👥 User Roles

| Role | Access |
|------|--------|
| **Admin** | Full system access |
| **Doctor** | Patients, OT, Lab, Radiology, Pharmacy |
| **Nurse** | Patients, Vitals, Lab results |
| **Receptionist** | Registration, Billing |
| **Pharmacist** | Prescriptions, Inventory |

### Default Users
- `admin / admin123` - Administrator
- `dr.sharma / doctor123` - Doctor
- `nurse.priya / nurse123` - Nurse
- `reception / reception123` - Receptionist
- `pharmacy / pharmacy123` - Pharmacist

---

## 🌐 Environment Variables

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/his_db
JWT_SECRET=your_secret_key
NODE_ENV=development
```

---

## 🎯 Key Highlights

1. ✅ **Production-Ready Security** - Helmet, rate limiting, sanitization
2. ✅ **Real-Time Updates** - Socket.io live notifications
3. ✅ **8+ Functional Modules** - Complete hospital workflow
4. ✅ **Performance Optimized** - Indexes, compression, caching
5. ✅ **Modern UI/UX** - Premium dark theme, responsive
6. ✅ **5 User Roles** - Complete RBAC implementation
7. ✅ **Error Handling** - Graceful shutdown, timeout handling
8. ✅ **Well-Documented** - System design page included

---

**Built with ❤️ for healthcare innovation**

## Default Login

- **Username:** admin
- **Password:** admin123
