export async function closeFiscalPeriod(periodId: string, adminId: string) {
  await prisma.$transaction(async tx => {
    const p = await tx.fiscalPeriod.findUniqueOrThrow({ where: { id: periodId } });
    if (p.status === "CLOSED") throw new Error("ALREADY_CLOSED");
    const tb = await trialBalance(p.endDate);
    // بستن: انتقال درآمد/هزینه به سود انباشته
    // (قید closing entry با refId = `close:${periodId}`)
    await tx.fiscalPeriod.update({ where: { id: periodId }, data: { status: "CLOSED", closedBy: adminId } });
  });
  // پس از بسته شدن، postJournal هر قیدی با fiscalDate داخل دوره را رد می‌کند
}
