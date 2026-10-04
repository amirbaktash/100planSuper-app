SETUP:
1. پیش‌نیاز: Node 20, Docker, kubectl/helm, Hardhat key از Vault
2. .env.prod → همه secretها از Vault (هیچ secret در repo)
3. docker compose up -d → migrations: npm run migrate:all (۱۱ سرویس)
4. قراردادها: npx hardhat deploy --network mainnet → آدرس‌ها در oracle-service
5. Seed ادمین اول + RBAC roles: npm run seed:admin
6. healthcheck: curl /healthz هر سرویس + e2e smoke

ADMIN MANUAL (فهرست):
  1. ورود و RBAC — ساخت نقش، تخصیص View/Edit/Approve
  2. KYC — صف بازبینی، تأیید چهره، رد با دلیل
  3. مالی — تراز آزمایشی، بستن دوره، DeadLetter، dual-approval برداشت
  4. وام — تأیید، فورکلوز، نرخ سود
  5. باشگاه — نرخ‌ها/tier override، payout batch، صف fraud flags
  6. گردونه — وزن/جایزه ۱۰ خانه، P/L صندوق
  7. گردشگری/بیمه — تور، موجودی، مطالبات
  8. CMS — گالری، WYSIWYG، Maker-Checker انتشار
  9. Audit Log — جستجو، export
