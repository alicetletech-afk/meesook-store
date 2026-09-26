# มีสุขส่งถึง — Front-end Starter v2

## สิ่งที่ปรับตามบรีฟ
- เพิ่ม CTA ชัดขึ้น
- ตัด emoji ออกจาก UI
- เพิ่มปุ่ม **เพิ่มลงตะกร้า** พร้อม cart icon แบบ e-commerce
- เพิ่มปุ่ม **สั่งซื้อเลย** สำหรับลูกค้าที่ต้องการซื้อสินค้าเดียว
- ทำ layout รองรับ responsive:
  - desktop: sidebar + storefront
  - tablet: stacked layout, 2-column products
  - mobile: single-column products
- เพิ่ม floating CTA card:
  - "สอบถามเพิ่มเติม"
  - "ไม่พบสินค้าที่หา?"
- เปลี่ยน mood & tone:
  - pastel
  - soft gradient
  - softer card / glass effect
- แก้ข้อความเป็น:
  - **ส่งฟรีที่ล็อบบี้ IDEO MOBI EASTGATE**
  - พื้นที่ใกล้เคียงให้สอบถามได้
- แก้ flow ออเดอร์:
  - ไม่ใช้ข้อความแนว “เลือกสินค้าแล้วส่งออเดอร์เข้า LINE ได้เลย”
  - ผู้ใช้ต้องกรอกข้อมูลก่อน
  - เมื่อกด **ส่งออเดอร์** ระบบควร save order เข้า Supabase ทันที
  - จากนั้นจึงเปิด LINE @435ktnsf พร้อมข้อความสรุปออเดอร์
  - ถ้าแอด LINE ไม่ติด / user ไม่จบ flow ใน LINE, order ยังต้องถูกเก็บไว้ในระบบแล้ว

---

## Files
- `index.html`
- `styles.css`
- `data.js`
- `app.js`

---

## Supabase tables (recommended)

### products
- id uuid pk
- name text
- category text
- subtitle text
- image_url text nullable
- stock numeric
- is_active boolean default true
- created_at timestamptz default now()

### product_variants
- id uuid pk
- product_id uuid references products(id)
- label text
- price numeric
- unit text nullable
- is_active boolean default true

### orders
- id uuid pk
- order_no text unique
- customer_name text
- room_no text
- phone text
- pickup_time text nullable
- note text nullable
- subtotal numeric
- status text default 'new'
- source text default 'web'
- created_at timestamptz default now()

Suggested statuses:
- new
- confirmed
- preparing
- ready
- completed
- cancelled

### order_items
- id uuid pk
- order_id uuid references orders(id)
- product_id uuid references products(id)
- variant_id uuid references product_variants(id)
- product_name_snapshot text
- variant_label_snapshot text
- unit_price numeric
- qty numeric
- line_total numeric

---

## Important implementation point

ใน `app.js` มีคอมเมนต์ `TODO (Cody)` ตรงปุ่ม **ส่งออเดอร์**

Flow ที่ควรเป็น:
1. user กด "ส่งออเดอร์"
2. validate required fields
3. save order ลง `orders`
4. save items ลง `order_items`
5. optional: reserve/decrease stock
6. รับ `order_no`
7. build LINE message
8. redirect ไป LINE OA `@435ktnsf`

> Key requirement: **save order first, open LINE after**

---

## Suggested enhancements for Cody
- ดึงสินค้า/ราคา live จาก Supabase แทน `data.js`
- เพิ่ม product image จริง
- เพิ่ม low stock warning
- ทำ CMS แยก:
  - dashboard
  - products
  - orders
  - analytics
- ทำ QR payment / แจ้งชำระภายหลังในอนาคต
