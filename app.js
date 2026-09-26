let snap, products=[], variants=[], cms={}, cart={}, selectedCat="all", pending=null;
const $=id=>document.getElementById(id), money=n=>`฿${Number(n).toLocaleString("th-TH")}`;
const categoryTH={water:"WATER",rice:"RICE",noodle:"NOODLE",other:"STORE"};

async function boot(){
  snap=await MeeSookStore.getSnapshot(); products=snap.products.filter(x=>x.active!==false); variants=snap.variants.filter(x=>x.active!==false); cms=snap.cms||{};
  $("heroTitle").innerHTML=(cms.hero_title||"ของกิน ของใช้ ส่งถึงง่ายๆ").replace("ส่งถึง","<br>ส่งถึง");
  $("heroDelivery").textContent=cms.delivery_copy||"ส่งฟรีที่ล็อบบี้ IDEO MOBI EASTGATE / พื้นที่ใกล้เคียง";
  $("helpTitle").textContent=cms.help_title||"ไม่พบสินค้าที่หาอยู่?";
  $("helpBody").textContent=cms.help_body||"สอบถามสินค้าอื่น เช็กสต๊อก หรือพื้นที่จัดส่งเพิ่มเติมได้เลย";
  ["lineTop","heroLine","helpLine"].forEach(id=>$(id).href=cms.line_url||"https://line.me/R/ti/p/@435ktnsf");
  render(); totals();
}
const getVariants=pid=>variants.filter(v=>v.product_id===pid);
const qtyForProduct=pid=>Object.values(cart).filter(x=>x.product_id===pid).reduce((s,x)=>s+x.qty,0);
function visible(){let q=$("search").value.toLowerCase().trim();return products.filter(p=>(selectedCat==="all"||p.category===selectedCat)&&(!q||`${p.name} ${p.description||""}`.toLowerCase().includes(q))).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))}
function render(){let list=visible();$("count").textContent=`${list.length} รายการ`;$("products").innerHTML=list.map(p=>{let vs=getVariants(p.id),q=qtyForProduct(p.id),min=Math.min(...vs.map(v=>+v.price)),stock=vs.reduce((s,v)=>s+(+v.stock||0),0);return `<article class="product-card"><div class="thumb"><span>${categoryTH[p.category]||"ITEM"}</span><span>คงเหลือ ${stock}</span></div><h4>${p.name}</h4><p>${p.description||""}</p><div class="price">${money(min)}</div><div class="card-actions">${q?`<div class="stepper"><button data-cardminus="${p.id}">−</button><b>${q}</b><button data-cardplus="${p.id}">+</button></div>`:`<button class="add" data-add="${p.id}">เพิ่มลงตะกร้า</button>`}<button class="buy" data-buy="${p.id}">สั่งซื้อเลย</button></div></article>`}).join("")}
function totals(){let arr=Object.values(cart),qty=arr.reduce((s,x)=>s+x.qty,0),total=arr.reduce((s,x)=>s+x.qty*x.price,0);$("cartCount").textContent=qty;$("cartTotal").textContent=money(total);$("sheetTotal").textContent=money(total);$("cartBar").classList.toggle("hidden",qty===0);$("cartItems").innerHTML=arr.map(x=>`<div class="cart-item"><div><b>${x.product_name}</b><small>${x.variant_label} · ${money(x.price)}</small></div><div class="qty"><button data-minus="${x.variant_id}">−</button><b>${x.qty}</b><button data-plus="${x.variant_id}">+</button></div></div>`).join("")||"ยังไม่มีสินค้า"}
function addVariant(variant_id,qty=1,replace=false){if(replace)cart={};let v=variants.find(x=>x.id===variant_id),p=products.find(x=>x.id===v.product_id);if(!cart[variant_id])cart[variant_id]={variant_id,product_id:p.id,product_name:p.name,variant_label:v.label,price:+v.price,qty:0};cart[variant_id].qty=Math.min(+v.stock,cart[variant_id].qty+qty);totals();render()}
function openOption(pid,buy=false){let p=products.find(x=>x.id===pid),vs=getVariants(pid);pending={pid,variant_id:vs[0].id,qty:1,buy};$("optionTitle").textContent=p.name;$("optionVariants").innerHTML=vs.map((v,i)=>`<button class="${i===0?"active":""}" data-v="${v.id}" ${+v.stock<1?"disabled":""}>${v.label} · ${money(v.price)} · เหลือ ${v.stock}</button>`).join("");$("optQty").textContent=1;calcOpt();$("optionSheetWrap").classList.remove("hidden")}
function calcOpt(){let v=variants.find(x=>x.id===pending.variant_id);$("optTotal").textContent=money(+v.price*pending.qty)}

document.addEventListener("click",e=>{
  let c=e.target.closest("[data-cat]");if(c){selectedCat=c.dataset.cat;document.querySelectorAll("[data-cat]").forEach(x=>x.classList.toggle("active",x===c));render();return}
  let a=e.target.closest("[data-add]");if(a){let vs=getVariants(a.dataset.add);if(vs.length>1)openOption(a.dataset.add,false);else addVariant(vs[0].id);return}
  let b=e.target.closest("[data-buy]");if(b){openOption(b.dataset.buy,true);return}
  let v=e.target.closest("[data-v]");if(v&&pending){pending.variant_id=v.dataset.v;document.querySelectorAll("#optionVariants button").forEach(x=>x.classList.toggle("active",x===v));calcOpt();return}
  let pl=e.target.closest("[data-plus]");if(pl){let v=variants.find(x=>x.id===pl.dataset.plus);cart[v.id].qty=Math.min(+v.stock,cart[v.id].qty+1);totals();render();return}
  let mi=e.target.closest("[data-minus]");if(mi){let k=mi.dataset.minus;cart[k].qty--;if(cart[k].qty<1)delete cart[k];totals();render();return}
  let cp=e.target.closest("[data-cardplus]");if(cp){let item=Object.values(cart).find(x=>x.product_id===cp.dataset.cardplus);if(item)addVariant(item.variant_id);return}
  let cm=e.target.closest("[data-cardminus]");if(cm){let item=Object.values(cart).find(x=>x.product_id===cm.dataset.cardminus);if(item){item.qty--;if(item.qty<1)delete cart[item.variant_id];totals();render()}return}
});
$("search").oninput=render;$("shopNow").onclick=()=>$("productSection").scrollIntoView({behavior:"smooth"});$("cartBar").onclick=()=>$("cartSheetWrap").classList.remove("hidden");$("closeCart").onclick=()=>$("cartSheetWrap").classList.add("hidden");$("closeOption").onclick=()=>$("optionSheetWrap").classList.add("hidden");
$("optMinus").onclick=()=>{pending.qty=Math.max(1,pending.qty-1);$("optQty").textContent=pending.qty;calcOpt()};$("optPlus").onclick=()=>{let v=variants.find(x=>x.id===pending.variant_id);pending.qty=Math.min(+v.stock,pending.qty+1);$("optQty").textContent=pending.qty;calcOpt()};$("confirmAdd").onclick=()=>{addVariant(pending.variant_id,pending.qty,pending.buy);$("optionSheetWrap").classList.add("hidden");if(pending.buy)$("cartSheetWrap").classList.remove("hidden")};$("deliveryType").onchange=()=>$("nearbyWrap").classList.toggle("hidden",$("deliveryType").value!=="nearby");

$("orderLine").onclick=async()=>{
  let arr=Object.values(cart);if(!arr.length)return alert("กรุณาเลือกสินค้า");
  if(!$("name").value.trim()||!$("room").value.trim()||!$("phone").value.trim())return alert("กรอกชื่อ เลขห้อง และเบอร์โทรก่อนนะคะ");
  let customer=await MeeSookStore.createCustomer({name:$("name").value.trim(),room:$("room").value.trim(),phone:$("phone").value.trim()});
  let delivery=$("deliveryType").value==="lobby"?"ล็อบบี้ IDEO MOBI EASTGATE":$("nearbyLocation").value.trim();
  let total=arr.reduce((s,x)=>s+x.price*x.qty,0);
  let result=await MeeSookStore.createOrder({order:{customer_id:customer.id,customer_name:customer.name,room:customer.room,phone:customer.phone,pickup_time:$("pickupTime").value.trim(),delivery_type:$("deliveryType").value,delivery_location:delivery,note:$("note").value.trim(),subtotal:total,total,status:"pending",payment_status:"pending",payment_method:"โอนเงิน",channel:"Web"},items:arr.map(x=>({variant_id:x.variant_id,product_name:x.product_name,variant_label:x.variant_label,unit_price:x.price,qty:x.qty}))});
  let text=[`มีสุขส่งถึง | ออเดอร์ใหม่`,`เลขออเดอร์: ${result.order_no}`,"","รายการสินค้า",...arr.map((x,i)=>`${i+1}. ${x.product_name} (${x.variant_label}) x${x.qty} = ${x.price*x.qty} บาท`),"",`ยอดรวม`,` ${total} บาท`,"","ข้อมูลผู้สั่ง",`ชื่อ: ${customer.name}`,`ห้อง: ${customer.room}`,`โทร: ${customer.phone}`,`เวลารับของ: ${$("pickupTime").value.trim()||"-"}`,"","จุดรับสินค้า",delivery,"","หมายเหตุ",$("note").value.trim()||"-"].join("\n");
  location.href=`https://line.me/R/oaMessage/@435ktnsf/?${encodeURIComponent(text)}`;
};
boot();