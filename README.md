# MediCare Hospital Information System


A full-stack Hospital Information System built with Node.js, Express, MongoDB, and vanilla JavaScript.

## Tech Stack

- **Backend:** Node.js, Express 5, MongoDB, Mongoose, Socket.io
- **Frontend:** HTML5, CSS3, JavaScript, Chart.js
- **Auth:** JWT, bcryptjs

## Features

- Patient Management (OPD/IPD/Emergency)
- Bed & Ward Management
- Operation Theater Scheduling
- Laboratory & Radiology Orders
- Pharmacy & Prescriptions
- Billing System
- Real-time Updates (Socket.io)
- Role-based Access Control

## Quick Start

```bash
# Install dependencies
npm install

# Seed database
node seeder.js

# Run server
npm start
```

## Environment Variables

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/his_db
JWT_SECRET=your_secret_key
NODE_ENV=development
```

## API Endpoints

| Route | Description |
|-------|-------------|
| /api/auth | Authentication |
| /api/patients | Patient CRUD |
| /api/beds | Bed & Ward Management |
| /api/surgeries | Surgery Scheduling |
| /api/labs | Lab Tests |
| /api/imaging | Radiology Orders |
| /api/prescriptions | Pharmacy |
| /api/bills | Billing |
| /api/dashboard | Statistics |

## Project Structure

```
config/          # Database config
controllers/     # Route handlers
models/          # Mongoose schemas
routes/          # API routes
public/          # Frontend assets
server.js        # Entry point
seeder.js        # Database seeder
```

## Default Login

- **Username:** admin
- **Password:** admin123

