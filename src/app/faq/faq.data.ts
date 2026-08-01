export interface FaqItem {
  question: string;
  answer: string;
}

// Single source of truth for the FAQ page — both the visible accordion and the FAQPage JSON-LD
// render from this same array (see faq.component.ts), so the structured data can never drift
// from what a visitor actually reads on the page. Grounded in real, currently-shipping behavior —
// no invented policies, no numbers that could go stale (e.g. the free-shipping answer is
// deliberately generic since the threshold is admin-configurable, not fixed).
export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'How does Travel Besty build my packing kit?',
    answer:
      "Answer a few questions about your trip — destination, season, how long you're going, and who's coming — and we build a personalized checklist from field-tested gear. Nothing generic, nothing you don't actually need.",
  },
  {
    question: 'Do I need an account to shop?',
    answer:
      "You can browse the shop and build a cart as a guest. You'll only need to log in (or create an account) when you're ready to check out.",
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      "We accept GCash, Maya, Maribank, and card. At checkout you'll pay via your chosen method and submit proof of payment, which our team verifies before your order ships.",
  },
  {
    question: 'How does payment verification work?',
    answer:
      'Once you submit your payment details and proof, your order shows "Verifying payment" while our team reviews it. You\'ll see the status update to "Paid" on your Orders page as soon as it\'s confirmed.',
  },
  {
    question: 'Can I track my order after I place it?',
    answer:
      'Yes — every order on your Orders page shows its current stage: Processing, Shipped, or Delivered, so you always know where it stands.',
  },
  {
    question: 'Can I cancel an order after placing it?',
    answer:
      'Yes, as long as it\'s still "Processing." Open the order from your Orders page and use Cancel Order. Once an order has shipped, it can no longer be cancelled this way.',
  },
  {
    question: 'Can I save a kit and buy it later?',
    answer:
      'Yes — save any kit you build to My Collection from your profile. You can revisit it anytime, adjust the items, and check out whenever you\'re ready.',
  },
  {
    question: 'Do you offer free shipping?',
    answer:
      "Orders over a qualifying amount ship free — smaller orders show a flat shipping fee. Your cart always shows exactly what applies before you check out.",
  },
];
