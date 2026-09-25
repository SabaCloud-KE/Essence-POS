# Essence Hair & Beauty Salon POS & Payment Management System

> **Production-Ready Point of Sale (POS), M-Pesa Express Payment Gateway, Real-Time Accounting, and Administration Platform for Essence Hair & Beauty Salon (Nairobi, Kenya).**

---

## 1. System Overview & Architecture

Essence Hair & Beauty Salon POS is a high-performance full-stack web application purpose-built for the Kenyan salon and beauty retail industry. The system enforces a **strict Zero-Cash, M-Pesa-Only policy** — all sales are initiated digitally, confirmed via Safaricom Daraja STK Push webhooks, and reconciled in real time.

```
                  +--------------------------------------------------+
                  |         Client Web Application (Next.js 14)       |
                  |   Tailwind CSS / Lucide Icons / Socket.io Client |
                  +-------------------------+------------------------+
                                            |
                         HTTPS REST API     |    WebSockets (ws://)
                         (Bearer JWT Auth)  |    (Real-Time Payment Alerts)
                                            v
                  +--------------------------------------------------+
                  |          Backend Application (NestJS 10)         |
                  |     Modular REST Controllers, Services, Guards   |
                  |      Audit Logging, Rate Limiting, RBAC, MFA     |
                  +------------+--------------------+----------------+
                               |                    |
             Prisma ORM (SQL)  |                    |  HTTPS STK Push & Webhooks
                               v                    v
         +-----------------------------+   +---------------------------------+
         |      MySQL Database         |   |    Safaricom Daraja M-Pesa API  |
         |  Transactions, Audit Logs,  |   |   STK Push Express, Callback    |
         |  Users, Services, Settings  |   |   Idempotent Webhook Processing |
         +-----------------------------+   +---------------------------------+
```

---

## 2. Key Features

### 🛒 Point of Sale (POS) Register
* **Fast Touch & Click Grid**: Browse catalog by category (*Braids & Locks, Hair Treatments, Styling, Nails & Spa, Facial & Skin*).
* **Kenyan Phone Number Validation**: Automatically formats numbers (`07...`, `01...`, `+254...`) to Safaricom standard `254XXXXXXXXX`.
* **Dynamic Cart**: Automatic subtotal, discount handling, and itemized summaries.
* **Instant M-Pesa Checkout**: Dispatches STK Push prompts directly to the customer's phone.
* **Built-in Dev Sandbox Simulator**: Test complete STK Push flows (PIN entry, user cancellation, timeout) directly from the UI without an active phone.
* **Thermal Digital Receipts**: Instant 80mm printable receipts with salon branding and downloadable PDF receipts.

### 💰 Strict Zero-Cash & M-Pesa Only Policy
* Sales **never** transition to `PAID` until Safaricom returns a verified webhook callback with `ResultCode: 0`.
* Robust 3-layer **Idempotency Guard**:
  1. Unique database constraint on `checkoutRequestId`.
  2. Transactional check preventing multiple updates to already paid records.
  3. Strict verification of `mpesaReceiptNumber` collision.

### 📊 Real-Time Admin Dashboard & Analytics
* **Live KPIs**: Today's Revenue, Paid Transaction Count, Average Ticket Size, Pending Payments, and Cancelled/Failed Rates.
* **WebSocket Live Sync**: Instant UI updates across connected registers the millisecond a payment is confirmed.
* **Visual Breakdown**: Top revenue-generating salon services and staff performance metrics.

### 📈 Financial & Business Reporting
* **Excel (.xlsx) Export**: Professionally formatted multi-column financial ledgers with salon header branding generated using `exceljs`.
* **PDF Financial Reports**: Clean tabular layout built with `pdfkit` for management audits.
* **Filter by Date Range**: Today, yesterday, this week, this month, or custom date ranges.

### 🔐 Enterprise Security & Access Control
* **Role-Based Access Control (RBAC)**: Distinct permissions for `ADMIN` and `STAFF`.
* **Two-Factor Authentication (TOTP / 2FA)**: Compatible with Google Authenticator, Microsoft Authenticator, Authy, and 1Password.
* **Brute-Force Protection**: 5 failed login attempts trigger an automatic 15-minute account lock.
* **Immutable Audit Trails**: Every sensitive action (login, sale creation, refund, password change, service modification) is logged with User ID, IP address, and timestamp.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Socket.io-client, date-fns |
| **Backend** | NestJS 10, TypeScript, Prisma ORM, Passport.js, JWT, Socket.io, PDFKit, ExcelJS, Otplib, QRCode |
| **Database** | MySQL / MariaDB (InnoDB, Decimal precision for all monetary values) |
| **Payment Gateway** | Safaricom Daraja API (Lipa Na M-Pesa Online / STK Push) |

---

## 4. Prerequisites

* **Node.js**: v18.0.0 or later (Node v20+ recommended)
* **npm**: v9.0.0 or later
* **MySQL / MariaDB**: MySQL 8.0+ or MariaDB 10.4+ (e.g., via XAMPP)
* **Git**

---

## 5. Quick Start Installation

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd "Essence Hair and Beauty Salon POS"
```

### Step 2: Configure MySQL Database
Start your MySQL server (via XAMPP Control Panel or MySQL service).

Create the database:
```sql
CREATE DATABASE IF NOT EXISTS essence_pos_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 3: Backend Setup
```bash
cd backend
npm install
```

Create `backend/.env` (or copy from `.env.example`):
```env
DATABASE_URL="mysql://root:@localhost:3306/essence_pos_db"
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

JWT_SECRET=super_secret_essence_jwt_key_2026_production_grade_salon_pos
JWT_EXPIRES_IN=8h
MFA_ENCRYPTION_KEY=essence_mfa_aes256_secret_key_32chars!

MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=your_daraja_consumer_key
MPESA_CONSUMER_SECRET=your_daraja_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_CALLBACK_URL=http://localhost:4000/api/payments/mpesa/callback

SALON_NAME="Essence Hair & Beauty Salon"
SALON_LOCATION="Nairobi, Kenya"
SALON_PHONE="+254 700 123 456"
SALON_EMAIL="info@essence.co.ke"
```

Push Prisma schema and seed initial data:
```bash
npx prisma db push
npm run seed
```

Build and run backend:
```bash
npm run build
node dist/src/main.js
# Or for development with live reload:
# npm run start:dev
```
*Backend runs on `http://localhost:4000/api`*

### Step 4: Frontend Setup
Open a new terminal:
```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

Build and run frontend:
```bash
npm run build
npm run start
# Or for development:
# npm run dev
```
*Frontend runs on `http://localhost:3000`*

---

## 6. Seeded User Accounts

The database seed populates the following test accounts:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Administrator** | `admin@essence.co.ke` | `AdminPassword2026!` | Full access (POS, Dashboard, Transactions, Services, Reports, Staff, Audit Logs, Settings) |
| **Staff Member** | `staff@essence.co.ke` | `StaffPassword2026!` | POS Register, Transaction Ledger (own sales) |
| **Senior Stylist**| `stylist@essence.co.ke`| `StaffPassword2026!` | POS Register, Transaction Ledger (own sales) |

> 💡 *On the login screen, click the "Admin Demo" or "Staff Demo" shortcut buttons for 1-click credential population.*

---

## 7. Safaricom Daraja M-Pesa Setup

### Sandbox Testing (Without Real Funds)
By default, the system is configured for the **Safaricom Daraja Sandbox**:
* **Shortcode**: `174379`
* **Passkey**: `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919`

#### Simulating Payments in Development:
When initiating a payment on the POS register, the UI offers real-time sandbox simulator controls:
1. Click **"Simulate Customer PIN Entry"**: Dispatches an authenticated mock callback with `ResultCode: 0`, marking the sale as `PAID` instantly and generating the receipt.
2. Click **"Simulate Cancel"**: Sends a simulated cancellation (`ResultCode: 1032`).

### Live Production Deployment
1. Register on the [Safaricom Daraja Developer Portal](https://developer.safaricom.co.ke/).
2. Apply for a **Lipa Na M-Pesa Online (Paybill or Buy Goods Till)** shortcode.
3. Update `backend/.env`:
   * Set `MPESA_ENVIRONMENT=production`
   * Fill in your live `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, and `MPESA_PASSKEY`.
   * Set `MPESA_CALLBACK_URL` to your publicly accessible webhook URL (e.g. `https://pos.essence.co.ke/api/payments/mpesa/callback`).
4. Ensure your server exposes port 443 with valid SSL/TLS (Safaricom requires HTTPS for production callbacks).

---

## 8. API Reference Summary

### Authentication (`/api/auth`)
* `POST /api/auth/login`: Authenticate with email and password. Returns JWT or MFA requirement.
* `POST /api/auth/mfa/verify`: Submit 6-digit TOTP code during 2FA login.
* `GET  /api/auth/me`: Retrieve current user profile and role.
* `POST /api/auth/mfa/setup`: Generate TOTP secret and QR code data URL.
* `POST /api/auth/mfa/confirm`: Verify TOTP code and activate MFA.
* `POST /api/auth/mfa/disable`: Deactivate MFA for current user.
* `POST /api/auth/change-password`: Update authenticated user password.

### POS & Sales (`/api/sales`)
* `POST /api/sales`: Create a new salon sale (validates prices server-side, generates receipt number `ESS-YYYYMMDD-XXXXX`).
* `GET  /api/sales`: Query sales with pagination, search, status, and date filters.
* `GET  /api/sales/:id`: Retrieve single sale breakdown with items and payments.
* `POST /api/sales/:id/cancel`: Cancel an uncompleted pending sale.

### Payments (`/api/payments`)
* `POST /api/payments/mpesa/stk-push`: Dispatch Daraja STK Push prompt to customer.
* `POST /api/payments/mpesa/callback`: Public webhook endpoint for Safaricom Daraja callbacks (idempotent).
* `POST /api/payments/mpesa/simulate-callback`: Sandbox developer simulation endpoint.
* `POST /api/payments/:id/refund`: Admin reversal/refund action with mandatory reason.

### Reports (`/api/reports`)
* `GET  /api/reports/dashboard-stats`: Aggregate metrics (Revenue, Counts, Top Services, Staff Performance).
* `GET  /api/reports/export/excel`: Download `.xlsx` financial spreadsheet.
* `GET  /api/reports/export/pdf`: Download management audit PDF report.
* `GET  /api/reports/receipt/pdf/:saleId`: Download thermal receipt PDF.

### Administration (`/api/services`, `/api/users`, `/api/logs`, `/api/settings`)
* Full CRUD for Salon Services catalog with active/deactivation flags.
* User account management, password resets, and role assignments.
* Paginated audit logs with metadata inspector.
* Dynamic system configuration parameters.

---

## 9. Automated Testing

Run backend test suites:
```bash
cd backend
npm run test
```

### Verified Test Suites:
* `mpesa.service.spec.ts`: Kenyan phone number normalization (`07...`, `01...`, `+254...`) & password token generation.
* `mpesa-callback.service.spec.ts`: Webhook idempotency, duplicate prevention, and atomic transactions.
* `roles.guard.spec.ts`: RBAC permission enforcement (`ADMIN` vs `STAFF`).

---

## 10. License & Salon Details

**Essence Hair & Beauty Salon**  
Nairobi, Kenya • [info@essence.co.ke](mailto:info@essence.co.ke)  
© 2026 Essence Hair & Beauty Salon. All rights reserved.
