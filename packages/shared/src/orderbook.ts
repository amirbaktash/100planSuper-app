// ═══════════════════════════════════════════════════════════════
// دفتر سفارش (OrderBook) — موتور تطبیق صرافی DARIC
// پشتیبانی از limit/market، عمق ۲۰ سطح، تطبیق سراسری
// ═══════════════════════════════════════════════════════════════

import type { Fill, Order } from "./types";

export class OrderBook {
  bids: Order[] = []; // مرتب نزولی بر قیمت
  asks: Order[] = []; // مرتب صعودی

  place(o: Order): Fill[] {
    const fills: Fill[] = [];
    if (o.side === "buy") {
      while (o.filled < o.qty && this.asks.length && (o.type === "market" || o.price! >= this.asks[0].price!)) {
        const best = this.asks[0];
        const qty = Math.min(o.qty - o.filled, best.qty - best.filled);
        const price = best.price!;
        fills.push({ price, qty, buyOrder: o.id, sellOrder: best.id });
        o.filled += qty;
        best.filled += qty;
        if (best.filled >= best.qty) this.asks.shift();
      }
      if (o.filled < o.qty) {
        this.bids.push(o);
        this.bids.sort((a, b) => b.price! - a.price!);
      }
    } else {
      while (o.filled < o.qty && this.bids.length && (o.type === "market" || o.price! <= this.bids[0].price!)) {
        const best = this.bids[0];
        const qty = Math.min(o.qty - o.filled, best.qty - best.filled);
        const price = best.price!;
        fills.push({ price, qty, buyOrder: best.id, sellOrder: o.id });
        o.filled += qty;
        best.filled += qty;
        if (best.filled >= best.qty) this.bids.shift();
      }
      if (o.filled < o.qty) {
        this.asks.push(o);
        this.asks.sort((a, b) => a.price! - b.price!);
      }
    }
    return fills;
  }

  /** عمق بازار — حداکثر ۲۰ سطح، بهترین قیمت اول */
  depth(levels = 20) {
    return {
      bids: this.bids.slice(0, levels).map((o) => ({ price: o.price!, qty: o.qty - o.filled })),
      asks: this.asks.slice(0, levels).map((o) => ({ price: o.price!, qty: o.qty - o.filled })),
    };
  }

  lastPrice(): number | undefined {
    return this.bids[0]?.price ?? this.asks[0]?.price;
  }

  cancel(id: string) {
    this.bids = this.bids.filter((o) => o.id !== id);
    this.asks = this.asks.filter((o) => o.id !== id);
  }
}
