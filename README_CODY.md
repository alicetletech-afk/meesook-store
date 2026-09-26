# มีสุขส่งถึง — CMS / POS prototype

เปิด `admin.html` เพื่อดูหลังบ้าน

## มีอะไรแล้ว
- Dashboard: ยอดขายวันนี้, จำนวนออเดอร์, รอชำระ, low stock
- POS: เลือกสินค้า, +/- จำนวน, เลือกวิธีชำระ, บันทึกการขาย และตัด stock
- Orders: เปลี่ยนสถานะ รอชำระ / ชำระแล้ว / พร้อมส่ง / สำเร็จ / ยกเลิก
- Products / Inventory: เพิ่มสินค้า, แก้สินค้า, ปรับ stock
- CMS: แก้ Hero, delivery copy, help CTA พร้อม preview
- Prototype ใช้ localStorage เพื่อกดเล่นได้ทันที

## Production / Supabase
แนะนำ tables:
- products
- product_variants
- inventory_movements
- orders
- order_items
- payments
- cms_settings

Flow:
1. Storefront checkout -> INSERT order + order_items
2. Supabase คืน order_no
3. ค่อยเปิด LINE พร้อมข้อความออเดอร์
4. POS checkout -> order + items + payment + inventory movement
5. stock ควรตัดด้วย transaction/RPC ป้องกัน oversell

ก่อนขึ้นจริง:
- Supabase Auth สำหรับ admin
- RLS
- server-side order number
- inventory audit log
