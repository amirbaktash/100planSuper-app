async function settleFill(pair: string, f: Fill, payFeeInDaric: boolean) {
  const [base, quote] = pair.split("/");
  const value = f.price * f.qty;

  await prisma.$transaction(async tx => {
    // فیس: taker = سفارش تازه وارد، maker = سفارش رست
    const feeQuote = value * (payFeeInDaric ? FEE_TAKER : FEE_TAKER);
    const feeDaric = payFeeInDaric ? value / await getDaricPrice() * FEE_DARIC : 0;

    // فروشنده: base کم می‌شود (از locked)، quote اضافه می‌شود (منهای فیس)
    await tx.balance.update({ where: { userId_asset: { userId: f.sellOrder, asset: base } },
      data: { amount: { decrement: f.qty }, locked: { decrement: f.qty } } });
    await tx.balance.upsert({ where: { userId_asset: { userId: f.sellOrder, asset: quote } },
      create: { userId: f.sellOrder, asset: quote, amount: String(value - feeQuote) },
      update: { amount: { increment: value - feeQuote } } });

    // خریدار: quote کم می‌شود (از locked)، base اضافه می‌شود
    await tx.balance.update({ where: { userId_asset: { userId: f.buyOrder, asset: quote } },
      data: { amount: { decrement: value }, locked: { decrement: value } } });
    await tx.balance.upsert({ where: { userId_asset: { userId: f.buyOrder, asset: base } },
      create: { userId: f.buyOrder, asset: base, amount: String(f.qty) },
      update: { amount: { increment: f.qty } } });

    // فیس به کیف صرافی
    if (payFeeInDaric) {
      await tx.balance.update({ where: { userId_asset: { userId: f.buyOrder, asset: "DARIC" } },
        data: { amount: { decrement: feeDaric } } });
      await tx.balance.upsert({ where: { userId_asset: { userId: "TREASURY", asset: "DARIC" } },
        create: { userId: "TREASURY", asset: "DARIC", amount: String(feeDaric) },
        update: { amount: { increment: feeDaric } } });
    } else {
      await tx.balance.upsert({ where: { userId_asset: { userId: "TREASURY", asset: quote } },
        create: { userId: "TREASURY", asset: quote, amount: String(feeQuote) },
        update: { amount: { increment: feeQuote } } });
    }

    await tx.fill.create({ data: { orderId: f.buyOrder, pair,
      price: String(f.price), qty: String(f.qty),
      feeAsset: payFeeInDaric ? "DARIC" : quote,
      feeAmount: String(payFeeInDaric ? feeDaric : feeQuote) } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  events.emit("trade", { pair, ...f });
  updateCandle(pair, f);
}
