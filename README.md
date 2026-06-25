# Dealtable — B2B Service Marketplace

A two-sided marketplace where clients post service requirements 
and providers bid on them, built around a trust layer that 
addresses the core failure modes of client-provider platforms.

**Live demo:** https://service-marketplace-client-tau.vercel.app  
**Backend API:** https://service-marketplace-77mz.onrender.com

> First load may take ~60 seconds — Render free tier cold starts.

---

## What makes this different

Most marketplaces just connect buyers and sellers. Dealtable adds:

- **Verified reviews** — only unlockable after a real completed deal
- **Deal approval flow** — provider submits work, client approves 
  or raises a dispute. Neither side can unilaterally close a deal.
- **Provider Directory** — clients can proactively browse providers 
  by category and rating instead of just posting and waiting
- **Deal Room** — shared activity thread locked after completion

---

## Tech Stack

React · Node.js · Express · MongoDB · JWT · Tailwind CSS · Jest

---

## Test Suite

17 passing property-based tests using Jest and fast-check,
running 100+ random iterations per invariant against an 
in-memory MongoDB instance.

```bash
cd server && npm test
```

---

## Run Locally

```bash
# Backend
cd server
cp .env.example .env
# Fill in MONGO_URI and JWT_SECRET
npm install
npm run dev

# Frontend (new terminal)
cd client
cp .env.example .env
# Set VITE_API_URL=http://localhost:5002
npm install
npm run dev
```

---

## Core Flow

```
Client posts requirement
  → Providers browse and bid
  → Client browses Provider Directory  
  → Client accepts a bid → Deal created
  → Provider submits work for approval
  → Client approves → Deal completed → Review unlocks
  → OR Client raises dispute → resolved → resubmit
```