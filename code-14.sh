#!/bin/bash
# اول فایل‌های بالا را در ساختار زیر ذخیره کنید، سپس:
mkdir -p daric/{contracts,services/{user,mlm,game,loan,accounting,nav,oracle,wallet,exchange,gold-silver,tourism,insurance,admin},packages/{shared,database},dashboard,deployment,security,deployment/mobile}
# ... فایل‌ها در جای خود ...
cd daric
zip -r ../daric-phase1-contracts.zip contracts/
zip -r ../daric-phase2-defi.zip     services/{nav,oracle,wallet,exchange,gold-silver}/ packages/
zip -r ../daric-phase3-finance.zip  services/{loan,accounting}/ packages/
zip -r ../daric-phase4-user-club.zip services/{user,mlm,game}/ dashboard/app/{auth,chat,club,games,tools}/ packages/
zip -r ../daric-phase5-tourism-admin.zip services/{tourism,insurance,admin}/ dashboard/app/{tourism,insurance,admin}/
zip -r ../daric-phase6-security-deploy.zip security/ deployment/ e2e/ dashboard/ packages/
echo "✅ 6 zips ready"
