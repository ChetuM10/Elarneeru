# 🥥 Elaneeru — Fresh Tender Coconut Subscription Platform

Elaneeru is a full-stack, hyper-local subscription service delivering chilled, hygienically pre-cut tender coconuts to doorsteps across Bengaluru every morning.

---

## 🚀 Key Features

* **Authentication:** Phone OTP with Firebase Authentication and backend JWT session verification.
* **Subscription Management:** Daily, alternate days, and weekly coconut delivery plans with interactive checkout.
* **Customer Dashboard:** Compact subscription controls, interactive Leaflet delivery location pin picker, skip delivery dates with undo support, and cancellation workflows.
* **Admin Dashboard:** Real-time metrics, automated daily delivery run generator, route inspection, and customer subscription management.
* **Payment Integration:** Razorpay payment orders, signature verification, and automated recurring billing hooks.
* **Database & ORM:** PostgreSQL schema powered by Prisma ORM with automated migrations.

---

## 🛠️ Tech Stack

* **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, Leaflet Maps
* **Backend:** Node.js, Express, TypeScript, Prisma ORM, Node-Cron, Firebase Admin SDK
* **Database:** PostgreSQL
* **Payments:** Razorpay API

---

## 📦 Setup & Development

### 1. Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📄 License
ISC License
