# มีสุขส่งถึง v5

Direction:
- กลับไปใช้โครงเวอร์ชันแรกที่อ่านง่าย
- เขียว + เหลือง + ครีม
- ไม่มี emoji ใน UI
- icon ใช้ inline SVG
- Hero มี CTA นำทาง:
  - เลือกซื้อสินค้า -> scroll ไปสินค้า
  - สอบถามเพิ่มเติม -> LINE
- CTA "ไม่พบสินค้าที่หาอยู่?" ย้ายไปล่างรายการสินค้า
- sticky cart bar ด้านล่างคงไว้
- สินค้ามี 2 ปุ่ม:
  - เพิ่มลงตะกร้า
  - สั่งซื้อเลย
- Checkout เพิ่ม "จุดรับสินค้า"
  - ล็อบบี้ IDEO MOBI EASTGATE
  - พื้นที่ใกล้เคียง + ช่องกรอกสถานที่
- LINE message format:
  - มีสุขส่งถึง | ออเดอร์ใหม่
  - รายการสินค้า
  - ยอดรวม
  - ข้อมูลผู้สั่ง
  - จุดรับสินค้า
  - หมายเหตุ
- LINE deep link ใช้ encodeURIComponent(text) ไม่ใช้ URLSearchParams
- Save Supabase ก่อน redirect LINE
