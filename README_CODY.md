# มีสุขส่งถึง — Front-end Starter

## Flow ที่ต้องการ
Customer:
1. Browse products
2. Select variant (ขวด / แพ็ค / กก.)
3. Add to cart
4. Enter ชื่อ / ห้อง / เบอร์ / หมายเหตุ
5. กด **ส่งออเดอร์ผ่าน LINE**
6. ก่อนเปิด LINE ให้บันทึกออเดอร์ลง Supabase
7. จากนั้น redirect ไป LINE OA `@435ktnsf` พร้อม prefilled order summary

## TODO สำหรับ Supabase

### Tables
#### products
- id uuid pk
- name text
- category text
- subtitle text
- image_url text nullable
- emoji text nullable
- stock numeric
- is_active boolean
- created_at timestamptz

#### product_variants
- id uuid pk
- product_id uuid fk
- label text
- price numeric
- unit text nullable
- is_active boolean

#### orders
- id uuid pk
- order_no text unique
- customer_name text
- room_no text
- phone text
- note text nullable
- subtotal numeric
- status text default 'new'
- created_at timestamptz

Suggested statuses:
`new`, `confirmed`, `preparing`, `ready`, `completed`, `cancelled`

#### order_items
- id uuid pk
- order_id uuid fk
- product_id uuid fk
- variant_id uuid fk
- product_name_snapshot text
- variant_label_snapshot text
- unit_price numeric
- qty numeric
- line_total numeric

## Important flow
ใน `app.js` ตรง `TODO (Cody)`:
1. create order
2. create order_items
3. decrease stock (ถ้าต้องการ)
4. return `order_no`
5. build LINE text with order_no
6. redirect to LINE

## CMS ที่ควรทำต่อ
Dashboard:
- sales today
- vs yesterday (% and ฿)
- order count
- average order value
- low stock count
- 7-day sales chart
- top products
- recent orders

Products:
- CRUD product
- upload product image to Supabase Storage
- CRUD variants
- stock
- active/inactive

Orders:
- status update
- search
- detail drawer
- date filter

## UI
- Mobile-first
- IBM Plex Sans Thai + Poppins
- Cream / green / yellow
- Rounded cards, soft spacing
- Keep storefront very simple

## LINE OA
Current ID: `@435ktnsf`
Storefront currently uses:
`https://line.me/R/oaMessage/@435ktnsf/?text=...`
