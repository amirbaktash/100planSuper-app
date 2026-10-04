app.get("/tours",  async (q, r) => r.json(await prisma.tour.findMany({
  where: { active: true, direction: q.query.direction }, include: { departures: true } })));
app.get("/inventory", async (q, r) => r.json(await prisma.inventoryItem.findMany({
  where: { type: q.query.type, active: true } })));
app.post("/bookings/tour", auth, requireKYC(2), async (q, r) =>
  r.status(201).json(await createTourBooking(q.user.id, q.body.tourId,
    q.body.departureId, q.body.travelers, q.body.passengers)));
app.post("/bookings/item", auth, requireKYC(2), async (q, r) =>
  r.status(201).json(await reserveInventory(q.user.id, q.body.itemId, q.body.qty)));
app.post("/bookings/:id/pay", auth, require2FA, async (q, r) =>
  r.json(await payBooking(q.user.id, q.params.id, q.body.payments)));
app.post("/bookings/:id/cancel", auth, async (q, r) => {
  // قوانین جریمه لغو: >7 روز = 10٪، <7 روز = 30٪، <48h = غیرقابل لغو
  r.json(await cancelBooking(q.params.id, q.user.id));
});
app.get("/bookings/my", auth, async (q, r) =>
  r.json(await prisma.booking.findMany({ where: { userId: q.user.id } })));
