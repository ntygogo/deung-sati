# ดึงสติ: ระบบรับเงินบนเว็บ — sandbox v1

สถานะ: โค้ดรองรับ Stripe PromptPay **เฉพาะรายการทดสอบ** ไม่เปิดรับเงินจริง และไม่มีการสมัครหักเงินรายเดือนอัตโนมัติ ยังต้องเชื่อมบัญชี Stripe และทดสอบกับ sandbox จริงก่อนใช้งาน ระบบทดสอบไม่ใช่หลักฐานว่าบัญชีผู้ประกอบการผ่านอนุมัติรับเงินแล้ว

## สิ่งที่ทำ

- ราคาอ้างอิง 149 บาท / 30 วัน ตั้งฝั่งเซิร์ฟเวอร์ (14900 สตางค์); ยังไม่ล็อกราคาขาย/โควตาจนวัดต้นทุน
- รักษาสิทธิ์ทดลองเดิม 14 วันจากข้อความแรก; ซื้อระหว่างทดลองหรือก่อนหมดอายุจะต่อจากวันหมดเดิม ซื้อหลังหมดอายุเริ่มจากเวลายืนยันยอด
- ซื้อก่อนเริ่มทดลอง: เริ่มสิทธิ์จ่ายทันที และไม่เริ่มสิทธิ์ฟรีใหม่หลังสิทธิ์จ่ายหมด
- ยืนยันลายเซ็น Stripe จาก raw request body แล้วดึงสถานะล่าสุดจาก Stripe API; การเปิด success URL / กดปุ่มเองไม่เปิดสิทธิ์
- การแจ้งซ้ำใช้ transaction + user/order row locks + event ID และไม่มีการเพิ่มวันซ้ำ; ราคาหรือ user ID จาก browser ไม่ใช่แหล่งยืนยัน
- รายการยังไม่สำเร็จไม่มีสิทธิ์ รายการคืนเต็มจำนวนยกเลิกสิทธิ์ของรายการนั้น คืนบางส่วนคงช่วงสิทธิ์เดิม
- การคืนเงินไม่เลื่อนช่วงสิทธิ์ของการซื้อรายการอื่น: หากคืน pass แรกแล้วมี pass ต่ออายุในอนาคต จะมีช่วงว่างตามวันที่ที่แสดงในประวัติ ต้องแจ้งผู้ทดสอบก่อนคืนเงินจริงในอนาคต และทบทวนนโยบายนี้ก่อน launch
- หมดสิทธิ์ยังอ่านประวัติเดิมได้ รายการเงินผูกบัญชีและอ่านได้เฉพาะเจ้าของ ผู้ดูแลรายงานกำหนดจาก user ID ฝั่งเซิร์ฟเวอร์
- เก็บ usage ของทุก model attempt ใน chat ทั้ง Express และ Vercel handler รวม fallback/cache/thinking ไม่เก็บเนื้อหาแชท ไม่มี metadata ถือว่าไม่ทราบต้นทุน ไม่ถือเป็นศูนย์
- ราคา AI เริ่มต้น standard text paid tier ณ 27 ก.ย. 2026: gemini-3.5-flash input/output/cache = 1.50/9.00/0.15 USD ต่อ 1M tokens, gemini-3.5-flash-lite = 0.30/2.50/0.03 โมเดลอื่นต้องตั้งอัตราเอง (ไม่เดาราคา preview alias)
- รายงาน 30 วัน: ยอดทดสอบ/คืนเงิน จำนวนเริ่มทดลอง ผู้ซื้อ ต้นทุนแยกโมเดล/บัญชี รายการที่ยังไม่ทราบต้นทุน และ CSV 100 รายการล่าสุด ไม่ใช่รายงานภาษีหรือยอด payout จริง

## ตั้งค่าเฉพาะ Preview / local

ใส่ข้อมูลผ่านหน้า Environment Variables ของ Vercel หรือไฟล์ env ที่ git ignore ไว้ **อย่าวาง key ในแชทหรือ repository**

| ชื่อ | ค่า |
|---|---|
| BILLING_MODE | `test` (ไม่ตั้ง = ปิด) |
| STRIPE_SECRET_KEY | test secret จากบัญชี Stripe ของเจ้าของแอป (`sk_test_…`) |
| STRIPE_WEBHOOK_SECRET | signing secret ของ endpoint (`whsec_…`) |
| BILLING_APP_ORIGIN | HTTPS origin ของ deployment ที่ทดสอบ ไม่มี path; local ใช้ http://127.0.0.1:5174 ได้ |
| BILLING_TEST_USER_IDS | user ID ของบัญชีทดสอบ คั่นด้วย comma |
| BILLING_ADMIN_USER_IDS | user ID ที่ดูรายงานได้ คั่นด้วย comma |
| AI_MODEL_RATES_USD | ไม่จำเป็น: JSON override ราคาต่อ 1M tokens แยก model เช่น `{"model-id":{"input":1.5,"output":9,"cachedInput":0.15}}` |

แยก preview database ออกจาก production และสร้างบัญชีทดสอบเฉพาะ ระบบไม่เดา ID จากชื่อ/อีเมลและไม่เพิ่มผู้ดูแลให้อัตโนมัติ เปิดหน้าชำระจากหน้าห้องแชท → สิทธิ์ใช้งานและการชำระเงิน ปุ่มจ่ายจะเปิดเฉพาะบัญชีทดสอบที่กำหนดและตั้งค่าครบ

ไม่มี public key จำเป็นสำหรับ hosted Checkout รูปแบบนี้ และไม่มีการเก็บข้อมูลบัตรในระบบเรา

Webhook: `/api/billing/webhook` (POST) ตั้ง event:

- checkout.session.completed
- checkout.session.async_payment_succeeded
- checkout.session.async_payment_failed
- checkout.session.expired
- charge.refunded
- refund.created
- refund.updated
- refund.failed

Endpoint ต้องให้ Stripe ส่งถึงได้; หาก preview มี Deployment Protection ให้ใช้ endpoint ทดสอบที่ได้รับอนุญาตให้ webhook เข้าอย่างเจาะจง ไม่ปิดการป้องกันทั้งโปรเจกต์โดยไม่จำเป็น หรือใช้ Stripe CLI forward เข้า local

## ตรวจสอบ

```sh
npm ci
npm run build
npm run test:beta
npm run test:billing
```

CI ทดสอบ SQLite และ Postgres 16 พร้อม concurrent fulfillment / duplicate deliveries บนฐานข้อมูลชั่วคราวใหม่ทุกครั้ง ตัวทดสอบใช้ SDK fixtures และ signed local webhook ไม่มีการเรียกเก็บเงินจริงหรือเรียก Gemini

ต้องทดสอบจริงหลังเชื่อม sandbox: QR สำเร็จ/ล้มเหลว/หมดอายุ, webhook ถึง Vercel พร้อม raw body, จ่ายแล้วปิดแท็บก่อนกลับ, refresh, ต่ออายุ, คืนบางส่วน/เต็ม, มือถือใช้ QR จากเครื่องเดียว และ error/retry โดยไม่ซื้อซ้ำ

## ก่อนรับเงินจริง

1. บัญชีผู้ประกอบการและประเภทบริการต้องผ่านผู้ให้บริการรับเงิน; ไม่ถือว่ารับอนุมัติเพียงเพราะ sandbox ใช้ได้
2. เก็บ token usage ของกลุ่มทดลองอย่างน้อย 7–14 วัน และเทียบบิลผู้ให้บริการ: ดูค่ากลาง/ผู้ใช้หนัก/fallback ก่อนล็อกราคาและโควตา
3. กำหนด allowance/rate limit และ cost alert ฝั่งเซิร์ฟเวอร์ก่อน live (รุ่นนี้ยังไม่ขาย unlimited และไม่มี paid usage cap เพราะ live ถูกปิดตาย)
4. จัดทำเงื่อนไขขาย/คืนเงิน/ความเป็นส่วนตัวและการเก็บหลักฐานธุรกรรม; เตรียมใบรับเงิน/ภาษีตามรูปแบบธุรกิจจริง
5. เพิ่ม live mode เป็นการเปลี่ยนโค้ดที่ review แยก พร้อม test/live data isolation, fee+payout reconciliation และการรับมือข้อร้องเรียน ยังไม่สามารถเปิด live ด้วยการเปลี่ยน key อย่างเดียว
6. การเก็บ usage ล้มเหลวมี log แจ้ง ไม่ทำให้ผู้ใช้เสียแชท แต่รายงานอาจไม่ครบ; ห้ามใช้รายงานประมาณการแทนบิลจริง

แหล่งทางการ: https://docs.stripe.com/payments/promptpay · https://docs.stripe.com/webhooks · https://stripe.com/th/pricing · https://ai.google.dev/gemini-api/docs/pricing
