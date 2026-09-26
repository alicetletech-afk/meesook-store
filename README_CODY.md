# มีสุขส่งถึง — Full Suite v2 / Supabase-ready

## หลักสำคัญ
หน้าร้าน + CMS + POS ใช้ **canonical data model เดียวกัน** ผ่าน `store.js`
จึงไม่ควรมีข้อมูลสินค้า/ลูกค้า/ออเดอร์คนละชุดกันอีก

## เปิดดู prototype
- `index.html` = หน้าร้าน
- `admin.html` = Dashboard / POS / Orders / Customers / Inventory / CMS
- ตอนยังไม่ใส่ Supabase จะใช้ `localStorage` + `seed.json`
- พอใส่ Supabase URL/anon key ใน `supabase-config.js` ระบบจะสลับไปอ่าน/เขียน Supabase

> หมายเหตุ: ถ้าเปิดไฟล์ด้วย `file://` บาง browser จะ block `fetch(seed.json)`.
> แนะนำรันผ่าน local server เช่น VS Code Live Server หรือ `python -m http.server`.

## หลังบ้าน
Dashboard
- ยอดขายวันนี้
- จำนวนออเดอร์วันนี้
- ลูกค้าทั้งหมด
- low stock
- กราฟยอดขาย 7 วัน
- กราฟสถานะออเดอร์

POS
- ใช้ products/variants ชุดเดียวกับหน้าร้าน
- +/- จำนวน
- บันทึก order + customer + stock

Orders
- ดูข้อมูลลูกค้า / ห้อง / เบอร์ / ยอด / ช่องทาง
- แก้ไขออเดอร์
- ลบออเดอร์
- status: pending / paid / ready / done / cancelled

Customers
- อ่านจาก customer table เดียวกับ checkout/POS
- ดูจำนวนออเดอร์ + ยอดซื้อรวม + ออเดอร์ล่าสุด

Products / Inventory
- Product + Variant
- ราคา / SKU / stock มาจากข้อมูลเดียวกับหน้าร้าน
- แก้หลังบ้านแล้วหน้าร้านอ่านค่าเดียวกัน

CMS
- Hero title
- Delivery copy
- Help title/body
- หน้าร้านอ่านจาก `cms_settings` ชุดเดียวกัน

## Supabase Setup
1. สร้าง Supabase project
2. เปิด SQL Editor
3. Run `schema.sql`
4. ไป Project Settings > API
5. ใส่ URL และ anon key ลง `supabase-config.js`

```js
window.MEESOOK_SUPABASE = {
  url: "https://xxx.supabase.co",
  anonKey: "..."
};
```

## Data Model
- products
- variants
- customers
- orders
- order_items
- payments
- inventory_movements
- cms_settings

## Important production notes
- `create_store_order()` เป็น transaction เดียว: order + items + deduct stock
- มี row locking ป้องกัน oversell ระหว่าง create order
- order number สร้าง server-side
- order_items cascade delete ตาม order
- `restore_order_stock()` เตรียมไว้สำหรับคืน stock เมื่อยกเลิก
- หลังบ้าน production ควรใช้ Supabase Auth และ session JWT ของ admin
- ตอนนี้ adapter ใช้ anon key ถ้ากรอก config ดังนั้น CRUD หลังบ้านจะติด RLS จนกว่า Cody จะต่อ Auth ให้เรียบร้อย
- อย่าเปิด policy ให้ anon แก้ orders/customers เพื่อแก้ปัญหาชั่วคราว เพราะข้อมูลลูกค้าไม่ควร public

## งานที่ Cody ต้องต่อให้ production สมบูรณ์
1. Supabase Auth สำหรับ admin
2. เปลี่ยน `store.js` admin request ให้ส่ง access token จาก session
3. import seed catalog เข้า Supabase จริง
4. ในการ cancel/delete order:
   - cancel: call `restore_order_stock(order_id)` ก่อนเปลี่ยน status ถ้าต้องคืน stock
   - delete: ตกลง business rule ก่อนว่าจะคืน stock หรือไม่
5. payment record / payment proof ถ้าจะใช้
6. image upload ผ่าน Supabase Storage ถ้าจะให้ CMS จัดการรูปจริง
7. เพิ่ม audit log ถ้าต้องการ trace คนแก้ order/stock


## v3 UX separation
หน้าบ้านและหลังบ้านใช้ข้อมูลเดียวกัน แต่ห้ามแสดงข้อมูลเหมือนกันทั้งหมด

### Storefront / ลูกค้าเห็น
- ชื่อสินค้า
- รูปสินค้า
- ราคา
- ตัวเลือกสินค้า
- สถานะ `พร้อมส่ง / เหลือน้อย / หมดชั่วคราว`
- ตะกร้า / Checkout / LINE

### Admin / เจ้าของร้านเห็น
- stock ตัวเลขจริง
- SKU
- customers
- order detail
- payment
- inventory
- sales summary
- charts
- edit/delete order
- CMS

**สำคัญ:** Storefront ห้าม expose stock quantity จริง แม้ว่าจะอ่าน stock จากฐานเดียวกัน
เพื่อคำนวณ availability เท่านั้น


## v4 UI polish
- Browser `confirm()` สำหรับลบออเดอร์ถูกแทนด้วย custom modal แล้ว
- ปิด modal ได้ด้วยปุ่มยกเลิก / คลิกพื้นหลัง / Esc
- destructive action ใช้ปุ่มสีแดงชัดเจน


## v5 dashboard compactness
- ปรับ Dashboard ให้เตี้ยและกระชับขึ้น
- ลดความสูงกราฟ
- จำกัดความสูงส่วนออเดอร์ล่าสุด / ต้องเติมสต๊อก แล้วให้ scroll ได้
- ลด padding ของ cards เพื่อไม่ให้หน้า overview ดูยืด


## v6 Buy Now flow
- ปุ่ม `ซื้อเลย` แยก flow จาก `เพิ่มลงตะกร้า`
- สินค้ามี variant เดียว:
  - ซื้อเลย -> ใส่สินค้านั้น 1 ชิ้น -> เปิด Checkout ทันที
- สินค้ามีหลาย variant:
  - ซื้อเลย -> Bottom Sheet เลือก variant + จำนวน
  - CTA เปลี่ยนเป็น `ไปหน้าส่งออเดอร์`
  - กดยืนยัน -> เปิด Checkout ทันที
- Buy Now ใช้ cart แบบ replace เพื่อให้ flow เป็น single immediate purchase
- Add to Cart ยังใช้ flow เดิมและให้ลูกค้าช้อปต่อได้


## v7 Admin fix
- แก้ JS bug ที่ทำให้เมนู/CMS หลังบ้านกดไม่ได้
- CMS Save ใช้งานได้ และเปลี่ยนผลลัพธ์เป็น toast แทน browser alert
- ปุ่มเปิดหน้าร้านเปลี่ยนจาก text link ลอย ๆ เป็น sidebar action button
- confirm modal ของ destructive action ยังอยู่เหมือนเดิม
