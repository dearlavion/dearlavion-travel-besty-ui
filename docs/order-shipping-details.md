# Order shipping details

How the recipient's name/email/address entered at checkout gets from the checkout form all the
way to the staff member who manually approves payment — and why that link didn't exist before.

Implemented in [`checkout.component.ts`](../src/app/checkout/checkout.component.ts) (frontend),
`order.schema.ts` / `orders.module.ts` / `orders.service.ts` in `dearlavion-store-engine`, and
`payment.schema.ts` / `payment.service.ts` / `store-engine.client.ts` in
`dearlavion-payment-service`.

## The problem this solves

`CheckoutComponent`'s shipping step has always collected `fullName`, `email`, `address`, `city`,
`postalCode` — but until this change, those fields lived **only** in the component's local form
state. Neither `Order` (store-engine) nor `Payment` (payment-service) had a shipping field, and
`PlaceOrderDto` / `CreatePaymentDto` didn't accept one. The moment the shopper navigated away from
`/checkout`, that data was gone.

The practical effect: **nobody could see where an order should ship.** Not the customer on Track
Packages, and — the part that actually mattered — not the staff member reviewing a payment on
`/admin/payments`. The manual-approval flow had a proof-of-payment image and an amount, but no
recipient and no address to fulfil against.

## Where shipping data lives

Two copies, by design, not by accident:

| Copy | Where | Role |
|---|---|---|
| Canonical | `Order.shipping` (store-engine) | The source of truth — set once, at checkout, never edited afterward. |
| Denormalized snapshot | `Payment.shipping` (payment-service) | Copied from the order at payment-submission time, purely so the review UI (`/admin/payments`) can display it without a second cross-service call. |

Both are the same shape:

```ts
{ fullName: string; email: string; address: string; city: string; postalCode: string }
```

## How it flows

1. **Checkout** (`CheckoutComponent.placeOrder()`) — the shipping fields the shopper already typed
   are added to the `Order` payload as `shipping: { ... }` and `POST`ed to store-engine.
2. **store-engine** (`OrdersService.place()`) — stores it on the `Order` document. `GET
   /orders/:id` returns it automatically (the endpoint already spreads `order.toJSON()`, so no
   extra code was needed there beyond adding the schema field).
3. **Payment submission** (`PaymentService.create()` in payment-service) — this method already
   calls `StoreEngineClient.getOrder()` to confirm the order exists before creating a `Payment`
   record (that's how `orderReference` gets denormalized today). Extending that same call's
   response type to include `shipping`, and copying it onto the new `Payment` doc, required no new
   inter-service request — just reading one more field off a response that was already being
   fetched.
4. **Display**:
   - `/admin/payments` — a compact "Ship to" line under the order reference in each row. This is
     the actual payoff: staff reviewing a pending payment now know where it goes.
   - `/profile/track-packages` — the same details shown to the customer on their own order card.

## Mock mode

Mock mode has no backend to denormalize from, so `PaymentService.submit()` (frontend) looks the
placed order up locally via `OrdersService.orders()` and copies its `shipping` onto the
locally-fabricated `Payment` object. Real mode gets `shipping` for free in the backend's response;
mock mode does the equivalent lookup client-side.

## Edge cases handled

- **Legacy orders** — orders placed before this change have no `shipping` field. It's optional at
  the schema level in both services (`shipping?: Shipping`), so old documents just come back with
  `shipping: undefined` rather than failing validation. `/admin/payments` shows "No shipping
  details on file" instead of blank space; Track Packages simply omits the line for those orders.
- **Tamper resistance** — `CreatePaymentDto` deliberately does **not** accept a client-submitted
  shipping value. The payment-service derives it server-side from the already-placed order, so a
  shopper can't submit a payment with shipping details that don't match what they actually checked
  out with.

## What this is **not**

- **Not editable after checkout.** There's no "update shipping address" flow on an existing order —
  the snapshot is fixed at placement time. Changing an address means placing a new order.
- **Not a multi-address book.** An opt-in "Save these details for next time" checkbox at checkout
  now saves *one* shipping detail per user (see
  [`order-shipping-details-saved.md`](./order-shipping-details-saved.md)) and prefills it on
  future checkouts — but it's a single overwrite-on-save record, not a list of named addresses
  with add/edit/delete/select-default.
- **Not backed by a notification/email service.** The `email` field is stored and displayed, but
  no confirmation email is actually sent from either backend — this app has no transactional-email
  infrastructure (the existing "email my kit" feature just opens the browser's own mail client, it
  doesn't send anything server-side).

## Manual test

1. Real-backend mode. Add an item to cart, go to `/checkout`, fill in shipping details, place the
   order, then submit a payment for it.
2. Log in as an admin/staff user and open `/admin/payments` — confirm the pending row shows a
   "Ship to" line with the exact name/address just entered.
3. Open `/profile/track-packages` as the customer — confirm the same order card shows a "Shipping
   to" line with the same details.
4. Sanity-check an order placed before this change (or any order created without a `shipping`
   payload) still renders both pages without errors, showing the "no shipping details" fallback.
