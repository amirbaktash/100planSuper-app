app.post("/auth/otp",        async (q, r) => r.json(await sendOtp(q.body.phone, q.body.purpose)));
app.post("/auth/register",   async (q, r) => r.json(await register(q.body.phone, q.body.otp, q.body.password, q.body.refCode)));
app.post("/auth/login",      async (q, r) => r.json(await login(q.body.phone, q.body.otp)));
app.post("/kyc/upload",  auth, upload.single("file"), async (q, r) => r.json(await uploadDoc(q.user.id, q.body.type, q.file!)));
app.post("/kyc/submit",  auth, async (q, r) => { await submitKycL1(q.user.id); r.json({ ok: true }); });
app.post("/kyc/face",    auth, upload.fields([{ name: "selfie" }, { name: "video" }]), async (q, r) =>
  r.json(await verifyFace(q.user.id, q.files.selfie[0].buffer, q.files.video[0].buffer)));
app.post("/security/2fa/enable",  auth, async (q, r) => r.json(await enable2FA(q.user.id)));
app.post("/security/2fa/verify",  auth, async (q, r) => r.json({ ok: await verify2FA(q.user.id, q.body.token) }));
app.put("/security/settings",     auth, async (q, r) => r.json(await updateSecurity(q.user.id, q.body)));
app.get("/me", auth, async (q, r) => r.json(await prisma.user.findUnique({
  where: { id: q.user.id }, select: { phone: true, referralCode: true, clubTier: true, kycStatus: true, kycLevel: true, security: true } })));
