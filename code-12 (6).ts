export async function buildTree(userId: string) {
  const me = await prisma.referral.findUniqueOrThrow({ where: { userId } });
  const descendants = await prisma.referral.findMany({
    where: { path: { startsWith: me.path + me.userId + "/" },
             depth: { lte: me.depth + 3 } },     // نمایش ۳ سطح
    include: { user: { select: { clubTier: true, createdAt: true } } } });
  return { root: userId, nodes: descendants };
}

app.post("/referral/link", auth, async (q, r) => {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: q.user.id } });
  r.json({ link: `process.env.APPURL/register?ref={process.env.APP_URL}/register?ref=process.env.APPU​RL/register?ref={u.referralCode}` });
});
app.get("/referral/tree", auth, async (q, r) => r.json(await buildTree(q.user.id)));
app.get("/club/stats", auth, async (q, r) => r.json(await downlineStats(q.user.id)));
app.get("/club/commissions", auth, async (q, r) =>
  r.json(await prisma.commission.findMany({
    where: { beneficiaryId: q.user.id }, orderBy: { id: "desc" }, take: 100 })));

// ادمین
app.put("/admin/rules", auth, async (q, res) => {  // تغییر نرخ + افزودن tier override
  if (!q.user.isAdmin) return res.sendStatus(403);
  const { category, level, tier, pct } = q.body;
  res.json(await prisma.commissionRule.upsert({
    where: { category_level_tier: { category, level, tier: tier ?? null } },
    create: { category, level, tier, pct }, update: { pct } }));
});
app.post("/admin/payout", auth, async (q, res) => {
  if (!q.user.isAdmin) return res.sendStatus(403);
  res.json(await runPayoutBatch(q.user.id));
});
