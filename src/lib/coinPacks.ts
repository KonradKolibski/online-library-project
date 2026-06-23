// Buyable coin packs, mirroring the Stripe products/Payment Links (test mode).
// Coins are credited server-side by the stripe-webhook function, which maps the
// purchased Stripe product id → coins; this catalog is only for display + the
// Payment Link the Buy button redirects to. Payment Link URLs are not secret.

export interface CoinPack {
  id: string;
  name: string;
  coins: number;
  /** Localised display price (PLN). */
  priceLabel: string;
  /** Stripe Payment Link (test mode). */
  paymentUrl: string;
}

export const COIN_PACKS: CoinPack[] = [
  {
    id: "handful",
    name: "Handful of Coins",
    coins: 100,
    priceLabel: "4,99 zł",
    paymentUrl: "https://buy.stripe.com/test_4gM14m4fJgBX3Lj9PA4Rq04",
  },
  {
    id: "pouch",
    name: "Pouch of Coins",
    coins: 250,
    priceLabel: "9,99 zł",
    paymentUrl: "https://buy.stripe.com/test_4gM9AS6nR85r0z7bXI4Rq03",
  },
  {
    id: "sack",
    name: "Sack of Coins",
    coins: 600,
    priceLabel: "19,99 zł",
    paymentUrl: "https://buy.stripe.com/test_5kQaEW6nR99vbdLbXI4Rq02",
  },
  {
    id: "chest",
    name: "Chest of Coins",
    coins: 1500,
    priceLabel: "39,99 zł",
    paymentUrl: "https://buy.stripe.com/test_3cI6oG5jNadz0z72n84Rq01",
  },
  {
    id: "vault",
    name: "Vault of Coins",
    coins: 3500,
    priceLabel: "79,99 zł",
    paymentUrl: "https://buy.stripe.com/test_3cI14mh2v0CZ95D3rc4Rq00",
  },
];
