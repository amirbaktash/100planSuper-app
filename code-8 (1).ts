import Redlock from "redlock";
export interface Order {
  id: string; userId: string; pair: string;
  side: "buy" | "sell"; type: "limit" | "market";
  price?: number; qty: number; filled: number; ts: number;
}
export interface Fill { price: number; qty: number; buyOrder: string; sellOrder: string; }

export class OrderBook {
  bids: Order[] = [];  // مرتب نزولی بر قیمت
  asks: Order[] = [];  // مرتب صعودی

  place(o: Order): Fill[] {
    const fills: Fill[] = [];
    if (o.side === "buy") {
      while (o.filled < o.qty && this.asks.length &&
             (o.type === "market" || (o.price! >= this.asks[0].price!))) {
        const best = this.asks[0];
        const qty = Math.min(o.qty - o.filled, best.qty - best.filled);
        const price = best.price!;
        fills.push({ price, qty, buyOrder: o.id, sellOrder: best.id });
        o.filled += qty; best.filled += qty;
        if (best.filled >= best.qty) this.asks.shift();
      }
      if (o.filled < o.qty && o.type === "limit") {
        this.bids.push(o);
        this.bids.sort((a, b) => b.price! - a.price!);
      }
    } else { // sell — متقارن
      while (o.filled < o.qty && this.bids.length &&
             (o.type === "market" || (o.price! <= this.bids[0].price!))) {
        const best = this.bids[0];
        const qty = Math.min(o.qty - o.filled, best.qty - best.filled);
        const price = best.price!;
        fills.push({ price, qty, buyOrder: best.id, sellOrder: o.id });
        o.filled += qty; best.filled += qty;
        if (best.filled >= best.qty) this.bids.shift();
      }
      if (o.filled < o.qty && o.type === "limit") {
        this.asks.push(o);
        this.asks.sort((a, b) => a.price! - b.price!);
      }
    }
    return fills;
  }

  depth() {
    return {
      bids: this.bids.slice(0, 20).map(o => ({ price: o.price, qty: o.qty - o.filled })),
      asks: this.asks.slice(0, 20).map(o => ({ price: o.price, qty: o.qty - o.filled })),
    };
  }
}
