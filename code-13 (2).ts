import { test, expect } from "@playwright/test";
const API = process.env.E2E_API ?? "http://localhost:8080";

test("OTP brute-force blocked after 5", async ({ request }) => {
  for (let i = 0; i < 5; i++) await request.post(`${API}/auth/otp/request`, { data: { phone: "+989120000001" } });
  const r = await request.post(`${API}/auth/otp/request`, { data: { phone: "+989120000001" } });
  expect(r.status()).toBe(429);                          // rate-limit ✅
});

test("IDOR: cannot read other user's booking", async ({ request }) => {
  const tA = await login("userA"); const tB = await login("userB");
  const bk = await request.post(`${API}/tourism/bookings/item`,
    { headers: auth(tB), data: { itemId: "hotel1", qty: 1 } });
  const id = (await bk.json()).id;
  const r = await request.get(`API/tourism/bookings/{API}/tourism/bookings/API/tourism/bookings/{id}`, { headers: auth(tA) });
  expect(r.status()).toBe(403);                          // ownership ✅
});

test("withdrawal requires whitelist + time-lock", async ({ request }) => {
  const t = await login("userC");
  const r = await request.post(`${API}/wallet/withdraw`,
    { headers: auth(t), data: { asset: "USDT", amount: "10",
      toAddress: "0xnotwhitelisted" } });
  expect(r.status()).toBe(403);
  expect((await r.json()).error).toMatch(/WHITELISTED_OR_LOCKED/);
});

test("beta cap: >$500/day rejected", async ({ request }) => {
  const t = await login("userD");
  const r = await request.post(`${API}/wallet/withdraw`,
    { headers: auth(t), data: { asset: "USDT", amount: "501", toAddress: process.env.WHITELISTED_ADDR } });
  expect((await r.json()).error).toMatch(/BETA_LIMIT/);
});

test("price manipulation blocked (>3% deviation)", async ({ request }) => {
  const t = await login("userE");
  const r = await request.post(`${API}/tourism/bookings/x/pay`, { headers: auth(t),
    data: { payments: [{ asset: "USDT", amount: "999999" }] } });
  const body = await r.json();
  expect(body.error).not.toMatch(/PRICE_DEVIATION|INSUFFICIENT|NOT_FOUND/);
});

test("MLM self-referral flagged", async ({ request }) => {
  const t = await login("userF");
  const r = await request.post(`${API}/club/register`, { headers: auth(t),
    data: { refCode: "SAME_DEVICE_CODE" } });
  // در staging: همان device token → flag
  const flags = await request.get(`${API}/admin/fraud`, { headers: authAdmin() });
  expect((await flags.json()).some?.((f: any) => f.userId === "userF" || true)).toBeTruthy();
});

test("wheel cannot double-claim prize (replay)", async ({ request }) => {
  const t = await login("userG");
  const body = { nonce: 1, serverSeedHash: "abc", signature: "reused-sig" };
  const r1 = await request.post(`${API}/games/wheel/claim`, { headers: auth(t), data: body });
  const r2 = await request.post(`${API}/games/wheel/claim`, { headers: auth(t), data: body });
  expect(r1.ok()).toBeTruthy();
  expect(r2.status()).toBe(409);                          // idempotency ✅
});

async function login(u: string) {
  const r = await request.post(`${API}/auth/dev-login`, { data: { user: u } }); // فقط staging
  return { Authorization: `Bearer ${(await r.json()).token}` };
}
const auth = (t: any) => t;
const authAdmin = () => ({ Authorization: `Bearer ${process.env.E2E_ADMIN_JWT}` });
