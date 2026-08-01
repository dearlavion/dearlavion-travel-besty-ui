# Saved shipping details (opt-in, per account)

How the "Save these details for next time" checkbox at checkout works, and how it's kept
separate from the per-order shipping snapshot described in
[`order-shipping-details.md`](./order-shipping-details.md).

Implemented in `src/shipping-details/shipping-details.schema.ts` / `.service.ts` / `.module.ts`
(`dearlavion-store-engine`) and
[`shipping-details.service.ts`](../src/app/checkout/shipping-details.service.ts) /
[`checkout.component.ts`](../src/app/checkout/checkout.component.ts) (frontend).

## Two different things named "shipping details" — don't conflate them

| | `Order.shipping` / `Payment.shipping` | `ShippingDetails` (this doc) |
|---|---|---|
| Cardinality | One snapshot per **order** | One record per **user** |
| Collection | `orders`, `payments` | `shipping_details` |
| Written | Every checkout, automatically | Only when the checkbox is checked |
| Mutability | Fixed forever once the order is placed | Overwritten every time the box is checked again |
| Purpose | "Where did *this* order ship" (audit trail, payment review) | "Prefill the form next time" (convenience) |

Placing an order always writes the first kind. The second kind is optional and only exists to
save the shopper retyping the form — the two are not kept in sync after the fact (updating your
saved details doesn't rewrite any past order's snapshot, and it can't — old orders' snapshots are
immutable by design).

## Where it lives

One document per `userId` (`unique + indexed`, mirrors `UserProfile` in
`src/profile/profile.schema.ts`), collection `shipping_details`:

```ts
{ userId, fullName, email, address, city, postalCode, updatedAt }
```

`GET /shipping-details` (auth-guarded) returns the caller's record, or `null` if they've never
opted in. Unlike `UserProfile.get()`, this does **not** auto-create a default document on first
read — there's no sensible non-empty default for an address the way "Traveler" / 🧳 work as
profile defaults, so a document only exists once someone has actually saved one.

`PUT /shipping-details` upserts it.

## Checkout behavior

- **Nothing saved yet**: the shipping form starts blank, checkbox unchecked.
- **Something is saved**: `CheckoutComponent` prefills all five fields and pre-checks the box —
  reactively, via an Angular `effect()` watching `ShippingDetailsService.details()`, so it fills
  in whether the value was already available synchronously (mock mode) or arrives after the real
  `GET` resolves.
- **Placing an order**: if the checkbox is checked, `ShippingDetailsService.save(...)` fires
  alongside `OrdersService.addOrder(...)` — non-blocking, doesn't gate order placement on the save
  succeeding.
- **Unchecking the box does not delete anything.** It only means "don't update my saved record
  with what I'm about to submit this time." A previously saved record is left exactly as-is until
  the box is checked and an order is placed again.

## What this is **not**

- **Not a multi-address book.** Single record per user, overwritten on save — no "Home" / "Work" /
  named addresses, no list, no picker.
- **Not a delete/manage UI.** There's no way to clear a saved record from the app today; saving a
  new one is the only way to change it.
- **Not required.** Checkout works exactly as before if the box is never checked — this is
  additive, opt-in convenience layered on top of the per-order snapshot, which is unaffected
  either way.

## Manual test

1. Real-backend mode, logged in, with nothing saved yet. Go to `/checkout` — form is blank,
   checkbox unchecked.
2. Fill in shipping details, check the box, place the order.
3. Add another item to cart, go to `/checkout` again — form is prefilled, checkbox pre-checked.
4. Uncheck the box, change the address, place the order.
5. Go to `/checkout` once more — confirm it still shows the address from step 2, not step 4
   (the unchecked submission never touched the saved record).
