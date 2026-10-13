# 🏥 CarePulse - Patient Appointment Booking Platform

> An enterprise-grade, full-stack healthcare scheduling web application built with **Next.js 16**, **TypeScript**, **Tailwind CSS**, and **Prisma ORM**. Features real-time slot locking, double-booking race condition immunity, and multi-role RBAC architecture (Patient, Doctor, and Admin).

---

## 🌟 Key Features

* **Patient Discovery & Booking**: Filter by medical specialties (Cardiology, Dermatology, Neurology, Pediatrics, Orthopedics) with instant reactivity.
* **5-Minute Temporary Slot Hold**: Simulates distributed locking during checkout to prevent duplicate bookings while filling out consultation details.
* **Race-Condition Immunity**: Backed by database composite unique constraints (`@@unique([doctorId, date, time])`) ensuring that two concurrent bookings for the exact same slot will never collide.
* **Doctor Portal**: Manage schedule rosters, mark consultations as `COMPLETED`, or cancel visits to immediately re-open slots to the public pool.
* **Hospital Admin Analytics**: Track capacity utilization, total bookings, revenue, and system-wide isolation guarantees.
* **Calendar Export (.ics)**: Download transactional calendar invites for Apple Calendar, Google Calendar, and Outlook.
* **Automated Concurrency Stress Testing**: Includes a runnable script that fires 20 simultaneous requests to prove zero double-booking under load.

---

## 🛠️ Tech Stack

* **Framework**: Next.js 16 (App Router, Turbopack)
* **Language**: TypeScript
* **Styling**: Tailwind CSS
* **Database & ORM**: SQLite / PostgreSQL with Prisma ORM
* **Icons**: Lucide React
* **Date Utilities**: Date-fns

---

## 🚀 Quick Start Guide

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/carepulse.git
cd carepulse
```

### 2. Install dependencies
```bash
npm install
```

### 3. Initialize the database
```bash
npx prisma db push
```

### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚡ Concurrency & Race Condition Verification

Run the automated stress test simulating 20 patients attempting to book the exact same slot at the exact same millisecond:

```bash
node test-concurrency.js
```

**Expected Result:**
```text
✅ Successes (Should be EXACTLY 1)  : 1
❌ Rejections (Should be EXACTLY 19) : 19
   Sample Rejection Message: "Double-Booking Conflict: Race condition intercepted by database unique constraint."
🎉 VERIFICATION PASSED: ZERO DOUBLE-BOOKINGS GUARANTEED!
```
