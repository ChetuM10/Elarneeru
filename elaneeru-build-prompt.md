# Build Prompt: Elaneeru — Tender Coconut Subscription Platform

> Paste this whole document into Claude Code (or hand it to a developer) as the starting brief. It describes what to build, in what order, with which tools. Sections marked **[DECIDE LATER]** are intentionally deferred — don't build them in v1.

---

## 1. What this business is

Elaneeru sells farm-fresh tender coconuts on a daily/alternate-day subscription, delivered to homes and small offices — the same model as Country Delight (milk) but for tender coconut water. Revenue is recurring, driven by subscriptions rather than one-off orders. Trust and freshness (same-day harvest, cold chain, no preservatives) are the entire value proposition, so the product must make freshness and delivery reliability visible to the customer at every step (last delivery date, next delivery date, ability to skip/pause).

A working landing page/design already exists (brand: "Elaneeru", palm-green + gold palette, Fraunces + Work Sans type). Reuse its copy, colors, and layout for the public marketing pages — don't redesign from scratch. **"Elaneeru" is a working name, not finalized** — keep the brand name, tagline, and any copy that references it in one config/constants file rather than hardcoded across components, so swapping it later (before domain/FSSAI registration) doesn't mean touching every page.

> **Still open, decide before launch (not blockers for starting the build):**
> - **Who delivers** — not decided yet (family vs hired staff). The schema already supports both: the `ADMIN` role can mark deliveries done itself if it's family doing it, and the separate `DELIVERY` role is there for when/if staff are hired. No rework needed either way.
> - **Launch area** — a few areas across the city, not just one neighborhood. Before going live you'll need the actual list of pincodes/areas to seed into `ServiceableArea` (see §7) — that's a data task, not a code one.
> - **Brand name** — still deciding, see note above.

## 2. Scope for v1 (beta)

Build ONLY this for the first working version:
- Customer can sign up with phone number (OTP), add an address, check if their pincode is serviceable
- Customer can view 2–3 subscription plans and subscribe to one
- At subscribe time, customer picks how they'll pay (see §5): pay online upfront (card/UPI), or pay the delivery person at the door (cash, or UPI/card at the door)
- Customer can pause/resume/cancel their subscription (e.g. going out of town)
- A simple admin panel (for the family, not customers) shows today's deliveries grouped by area, lets someone mark each as delivered and payment as collected, and flags any unpaid deliveries
- A scheduled job generates tomorrow's delivery list automatically from active subscriptions

Explicitly **out of scope for v1** — do not build these yet:
- Route optimization / map-based delivery routing (do it manually from the admin list at this scale)
- UPI Autopay / recurring mandate billing
- WhatsApp/SMS automation (manual for now; wire up the provider later)
- Referral programs, loyalty points, multiple product SKUs
- Native mobile app (a responsive web app is enough for beta)
- Multi-city support (hardcode one city — the `ServiceableArea` table can still list several specific areas/pincodes within it, that's expected)

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Backend API | Node.js + Express + TypeScript | Matches existing skills; also the most useful thing to practice for backend job-hunting alongside this |
| ORM | Prisma | Already familiar; gives type-safe queries and migrations |
| Database | PostgreSQL (hosted on Neon or Railway) | Subscriptions and payments are relational, transactional data — this needs ACID guarantees a document DB doesn't give you for free. See §7 for why. |
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS | One codebase for the marketing site and the logged-in customer dashboard; Tailwind makes porting the existing HTML/CSS design fast |
| Auth | Firebase Phone Auth (OTP) for customers, JWT (custom, httpOnly cookie) for sessions after OTP verifies | Phone-number OTP is how Indian D2C customers expect to log in — building your own SMS OTP infra is unnecessary cost/complexity at this stage; Firebase's free tier covers beta volume |
| Payments | Razorpay — Standard Checkout for online card/UPI, plus a manual "collected on delivery" flow for cash/at-the-door payments (see §5) | Dominant in Indian D2C apps, best UPI support, straightforward docs |
| Notifications | Plain SMS/WhatsApp via MSG91 or similar — order-confirmation and payment-due reminders only | Indian customers respond better to WhatsApp/SMS than push notifications for something this habitual |
| Hosting | Backend: Railway or Render · DB: Neon (or Railway's managed Postgres) · Frontend: Vercel | All have workable free/cheap tiers for a beta with a small user base |
| Validation | Zod | Pairs naturally with Express + TypeScript for request validation |

## 4. Frontend design system & boilerplate

The approved mockup is the source of truth for look and feel. Don't let the coding tool reinvent colors/fonts when it ports pages — hand it these tokens directly.

**Design tokens** (from the approved mockup):

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F2F4E6` | Page background |
| `--bg-card` | `#FFFDF7` | Card/panel background |
| `--green-deep` | `#123A2C` | Headings, primary buttons on light backgrounds, dark sections |
| `--green-mid` | `#2E7D5C` | Hover states, secondary accents |
| `--green-pale` | `#D3E6C6` | Soft fills (icon backgrounds, hero blob) |
| `--gold` | `#E3A23A` | Primary CTA background |
| `--gold-deep` | `#C4831F` | CTA hover, focus outline |
| `--brown` | `#6B4226` | Rare accents only |
| Display font | `Fraunces` (serif, 400–700) | Headings only |
| Body font | `Work Sans` (400–700) | Everything else |

**`tailwind.config.ts` — set this up first, before porting any page:**

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F2F4E6',
        bgCard: '#FFFDF7',
        greenDeep: '#123A2C',
        greenMid: '#2E7D5C',
        greenPale: '#D3E6C6',
        gold: '#E3A23A',
        goldDeep: '#C4831F',
        brand: {
          brown: '#6B4226',
        },
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'serif'],
        body: ['var(--font-work-sans)', 'sans-serif'],
      },
      borderRadius: {
        organic: '42% 58% 61% 39% / 45% 40% 60% 55%',
      },
    },
  },
} satisfies Config
```

**`app/layout.tsx` — load fonts the Next.js way (self-hosted, no FOUC), not via the `@import` the static mockup used:**

```tsx
import { Fraunces, Work_Sans } from 'next/font/google'

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', weight: ['500', '600', '700'] })
const workSans = Work_Sans({ subsets: ['latin'], variable: '--font-work-sans', weight: ['400', '500', '600', '700'] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${workSans.variable}`}>
      <body className="bg-bg text-greenDeep font-body">{children}</body>
    </html>
  )
}
```

**Reusable primary button (`components/ui/PrimaryButton.tsx`)** — use this instead of ad hoc button styling on every page:

```tsx
export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-lg bg-gold px-6 py-3.5 font-semibold text-greenDeep transition
                 hover:bg-goldDeep hover:-translate-y-px focus-visible:outline focus-visible:outline-2
                 focus-visible:outline-goldDeep focus-visible:outline-offset-2"
    >
      {children}
    </button>
  )
}
```

Port the rest of the mockup (hero, plan cards, steps, footer) into components under `components/` using these same tokens — don't introduce new colors or a second display font along the way.

## 5. Payment methods

Support three ways to pay, chosen per subscription (customer can change it later):

1. **Online upfront — card or UPI, via Razorpay Standard Checkout.** Razorpay's checkout supports:
   - **Cards:** Visa, Mastercard, RuPay, American Express, Diners Club
   - **UPI:** any UPI app (GPay, PhonePe, Paytm, BHIM, etc.) via UPI intent, collect, or QR — this isn't card-network-specific, it's a single UPI integration in Razorpay
   - **Netbanking / wallets** come free with the same integration; no extra work to expose them too
2. **Cash on delivery (COD)** — delivery person collects cash at the door; admin panel marks the delivery as paid manually.
3. **Pay at delivery, digitally** — same moment as COD, but the customer pays by UPI or card instead of cash. The realistic v1 way to do this without hardware is a **UPI QR code** the delivery person shows (a static QR per delivery person, or a per-order Razorpay payment link/QR generated at delivery time) — customer scans and pays with any UPI app on the spot. A physical card-swipe (POS soundbox/machine) is a separate hardware purchase — treat that as a **[DECIDE LATER]** once cash handling becomes a real problem, not a v1 requirement.

Recurring UPI Autopay (fully automatic recurring billing, no manual step at all) is also a **[DECIDE LATER]** upgrade — worth it once you have enough steady subscribers that manual collection becomes the bottleneck, not before.

## 6. Why not a wallet-only model

An earlier version of this plan proposed a prepaid wallet (top up once, auto-debit per delivery) purely because it's simpler to engineer. Since COD is a hard requirement now, delivery-level payment tracking is unavoidable anyway — so build it once, properly, and let a customer's chosen payment mode (online-prepaid, COD, or pay-at-delivery) hang off that instead of forcing everyone through a wallet. A wallet can still be offered later as a fourth, convenience option for repeat customers who'd rather not pay every delivery.

## 7. Database schema (Prisma models to create)

```
User            id, phone (unique), name, email?, role [CUSTOMER|ADMIN|DELIVERY], createdAt
Address         id, userId, line1, area, city, pincode, lat?, lng?, isDefault
Product         id, name, description, imageUrl, active
Plan            id, productId, name, quantityPerDelivery, frequency [DAILY|ALTERNATE|WEEKLY], pricePerDelivery
Subscription    id, userId, planId, addressId, status [ACTIVE|PAUSED|CANCELLED], startDate, nextDeliveryDate, deliverySlot,
                defaultPaymentMode [ONLINE_PREPAID|COD|PAY_AT_DELIVERY_DIGITAL]
SubscriptionPause  id, subscriptionId, pausedFrom, pausedTo
Delivery        id, subscriptionId, userId, deliveryDate, status [SCHEDULED|DELIVERED|SKIPPED|FAILED], quantity, deliveredAt,
                paymentMode [ONLINE_PREPAID|COD|PAY_AT_DELIVERY_DIGITAL], paymentStatus [PENDING|COLLECTED|FAILED], amountDue
Payment         id, userId, deliveryId?, razorpayOrderId?, razorpayPaymentId? (unique), amount, method [CARD|UPI|CASH],
                status [CREATED|PAID|FAILED], createdAt
ServiceableArea id, pincode (unique), city, active
```

Key relations: User 1—N Address, User 1—N Subscription, Subscription 1—N Delivery, Delivery 1—0/1 Payment, User 1—N Payment.

## 8. Core flows to implement, in order

1. **Auth** — phone OTP via Firebase → verify on backend → issue JWT in httpOnly cookie → create `User` row if new.
2. **Serviceability + address** — customer enters pincode; check against `ServiceableArea`; if OK, let them save an `Address`.
3. **Plans + subscribe** — list `Plan`s; on subscribe, create a `Subscription` row with a chosen `defaultPaymentMode`.
4. **Nightly delivery generation (cron)** — for every ACTIVE subscription whose `nextDeliveryDate` is tomorrow and isn't paused, create a `Delivery` row (SCHEDULED, `paymentStatus` PENDING, `paymentMode` copied from the subscription's default), and advance `nextDeliveryDate`.
5. **Online prepaid path** — if `paymentMode` is ONLINE_PREPAID, the customer pays for that delivery (or a batch of upcoming ones) via Razorpay Checkout before/at delivery; verify the payment signature server-side, mark `Delivery.paymentStatus = COLLECTED`, log a `Payment` row.
6. **COD / pay-at-delivery path** — delivery person delivers, then in the admin/delivery app marks the delivery DELIVERED and records how payment was collected (CASH, or UPI/CARD if paid via QR at the door) → sets `paymentStatus = COLLECTED`.
7. **Pause/resume/cancel** — customer creates a `SubscriptionPause` row (date range) or cancels; the cron job in step 4 respects it.
8. **Admin dashboard** — list today's `Delivery` rows grouped by area/pincode; mark delivered + payment collected in one action; a view of any deliveries left unpaid.

## 9. API endpoints (Express, REST)

```
POST   /auth/otp/verify              -> verify Firebase token, issue session cookie
GET    /me                           -> current user profile
GET    /serviceable?pincode=         -> boolean
POST   /addresses                    GET /addresses           PATCH/DELETE /addresses/:id
GET    /plans
POST   /subscriptions                GET /subscriptions/me    PATCH /subscriptions/:id
POST   /subscriptions/:id/pause      POST /subscriptions/:id/resume
POST   /deliveries/:id/pay           -> creates Razorpay order for that delivery (online-prepaid path)
POST   /deliveries/:id/pay/verify    -> verifies Razorpay signature, marks delivery paid
POST   /webhooks/razorpay            -> Razorpay webhook receiver (source of truth for payment status, see §11)
GET    /admin/deliveries?date=       PATCH /admin/deliveries/:id           -> mark delivered / payment collected
GET    /admin/customers
```

Every route that reads/writes a specific record (an address, a subscription, a delivery) must check that the record belongs to `req.user.id` — not just that the caller is logged in. All `/admin/*` routes require `role === 'ADMIN'` (or `DELIVERY` for the mark-delivered action) via middleware.

## 10. Non-functional requirements

- TypeScript strict mode on both frontend and backend
- Mobile-first responsive UI (most customers, and the delivery person marking payments, will use this on a phone)
- Basic structured logging (`pino`) and a global Express error-handling middleware that never leaks stack traces to the client
- Automated DB backups (Neon/Railway both offer this — turn it on, don't rely on manual exports)

## 11. Security requirements — treat as non-negotiable, not a v2 cleanup task

**Authentication & sessions**
- Rate-limit `/auth/otp/*` per phone number AND per IP (e.g. 5 requests / 15 min) to block OTP-spam and enumeration
- Access token short-lived (~15 min); refresh token rotated on use; both stored in httpOnly, Secure, SameSite=Strict cookies — never in localStorage, which is readable by any injected script
- Revoke/rotate refresh tokens on logout

**Authorization**
- Role middleware (`CUSTOMER` / `ADMIN` / `DELIVERY`) on every protected route
- Object-level ownership checks on top of role checks — e.g. `GET /subscriptions/:id` must confirm the subscription belongs to the requesting user, not just that they're logged in. Skipping this is the single most common real-world API bug (IDOR) and directly exposes other customers' addresses/orders

**Payments**
- Never trust a client-sent amount — always recompute from `Plan` server-side before creating a Razorpay order
- Verify Razorpay signatures server-side on both the checkout callback and the Razorpay **webhook** — webhooks are the source of truth; a checkout callback can be dropped or spoofed client-side
- Make payment recording idempotent: a unique constraint on `razorpayPaymentId` so a retried webhook delivery can't double-credit a payment
- Razorpay secret keys live only in backend env vars — never shipped to the frontend bundle

**Transport & headers**
- HTTPS everywhere (automatic on Vercel/Railway/Render — just don't disable it)
- `helmet` middleware on Express for standard headers (CSP, X-Frame-Options, X-Content-Type-Options)
- CORS locked to the exact frontend origin, `credentials: true` only for that origin — not a wildcard
- CSRF protection for cookie-authenticated state-changing requests: SameSite=Strict cookies plus a custom header check on POST/PATCH/DELETE

**Data handling**
- Never log phone numbers, OTPs, or full addresses in plaintext application logs
- Managed Postgres (Neon/Railway) encrypts data at rest by default — no extra app-level field encryption needed for v1

**Input & operational hygiene**
- Zod validation on every request body/query param; reject unknown fields rather than silently ignoring them
- Prisma's parameterized queries prevent SQL injection by default — never hand-build raw SQL with string interpolation
- Rate-limit every public POST endpoint that costs money or sends messages (subscribe, payment creation), not just OTP
- Keep dependencies patched — enable Dependabot or run `npm audit` on a schedule

## 12. Suggested folder structure

```
backend/
  src/
    routes/  controllers/  services/  middleware/  config/  utils/
    jobs/generateDeliveries.ts     # the nightly cron
  prisma/schema.prisma
frontend/
  app/
    (marketing)/page.tsx           # port the existing landing page here
    (customer)/dashboard/          # subscriptions, payments, addresses
    (admin)/admin/                 # delivery + payment-collection views
  components/
    ui/                            # PrimaryButton, cards, etc. — the design-system layer from §4
  lib/api.ts
```

## 13. Environment variables

```
DATABASE_URL=
JWT_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
FIREBASE_PROJECT_ID= / FIREBASE_CLIENT_EMAIL= / FIREBASE_PRIVATE_KEY=
FRONTEND_URL=   # for CORS
NODE_ENV=
```

## 14. One important non-technical dependency

None of this matters if the business itself isn't legally set up to sell a packaged food/beverage product in India. Before taking real payments: register for **FSSAI Basic Registration** (turnover under ₹12 lakh/year) or a **State License** (above that) — it's mandatory for any food/beverage business including fresh produce and packaged drinks, and Razorpay's onboarding (KYC) will likely ask for business registration details too. This is a paperwork task, not a coding one, but it blocks going live with real customers.

## 15. Build order (do it in this sequence)

1. Prisma schema + migrations against a local Postgres, seed a couple of plans
2. Auth (Firebase OTP + JWT session) end-to-end, with the rate limits and cookie settings from §11 in place from day one — not bolted on later
3. Address + serviceability check
4. Plans + subscribe flow (including choosing a payment mode)
5. Nightly delivery-generation job (can run manually via a script before wiring up a real scheduler)
6. Razorpay online-prepaid path + webhook receiver (test mode keys first)
7. Admin delivery list + mark-delivered/payment-collected (covers COD and pay-at-delivery)
8. Set up `tailwind.config.ts` + fonts from §4, then port the existing marketing page design into the Next.js app
9. Deploy: Postgres → backend → frontend, wire up production env vars and live Razorpay keys last
