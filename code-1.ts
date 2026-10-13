  const fills = ob.place({ id: "b1", side: "buy", type: "market", qty: 8, filled: 0 } as any);

  expect(fills).toHaveLength(2);
  expect(fills[0]).toMatchObject({ price: 100, qty: 5, buyOrder: "b1", sellOrder: "s1" });
  expect(fills[1]).toMatchObject({ price: 102, qty: 3, sellOrder: "s2" });
  // سفارش فروش دوم باید ۲ واحد باقیمانده داشته باشد
  expect(ob.asks).toHaveLength(1);
  expect(ob.asks[0].filled).toBe(3);
});

test("limit order does not cross beyond its price", () => {
  const ob = new OrderBook();
  ob.place({ id: "s1", side: "sell", type: "limit", price: 105, qty: 5, filled: 0 } as any);
  const fills = ob.place({ id: "b1", side: "buy", type: "limit", price: 100, qty: 5, filled: 0 } as any);
  expect(fills).toHaveLength(0);
  expect(ob.bids).toHaveLength(1);
  expect(ob.asks).toHaveLength(1);
});

test("full fill removes resting order from book", () => {
  const ob = new OrderBook();
  ob.place({ id: "s1", side: "sell", type: "limit", price: 100, qty: 5, filled: 0 } as any);
  ob.place({ id: "b1", side: "buy", type: "limit", price: 100, qty: 5, filled: 0 } as any);
  expect(ob.asks).toHaveLength(0);
  expect(ob.bids).toHaveLength(0);
});

test("depth returns top 20 levels only", () => {
  const ob = new OrderBook();
  for (let i = 0; i < 30; i++)
    ob.place({ id: "b" + i, side: "buy", type: "limit", price: 100 - i, qty: 1, filled: 0 } as any);
  const d = ob.depth();
  expect(d.bids).toHaveLength(20);
  expect(d.bids[0].price).toBe(100); // بهترین قیمت اول
});
