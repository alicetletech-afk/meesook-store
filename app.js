let snap, products=[], variants=[], cms={}, cart={}, selectedCat="all", pending=null;
const $=id=>document.getElementById(id), money=n=>`฿${Number(n).toLocaleString("th-TH")}`;
function clearCheckoutErrors(){
  $("checkoutError").classList.add("hidden");
  $("checkoutErrorText").textContent="";
  ["name","room","phone","nearbyLocation"].forEach(id=>{
    const el=$(id); if(el) el.classList.remove("field-error");
  });
}
function showCheckoutErrors(items){
  clearCheckoutErrors();
  const labels=[];
  items.forEach(({id,label})=>{
    const el=$(id);
    if(el) el.classList.add("field-error");
    labels.push(label);
  });
  $("checkoutErrorText").textContent=`กรุณากรอก: ${labels.join(" / ")}`;
  $("checkoutError").classList.remove("hidden");
  const first=items[0] && $(items[0].id);
  if(first) first.focus();
}


async function boot(){
  snap=await MeeSookStore.getSnapshot();
  products=snap.products.filter(x=>x.active!==false);
  variants=snap.variants.filter(x=>x.active!==false);
  cms=snap.cms||{};
  $("heroTitle").innerHTML=(cms.hero_title||"ของกิน ของใช้ ส่งถึงง่ายๆ").replace("ส่งถึง","<br>ส่งถึง");
  $("heroDelivery").textContent=cms.delivery_copy||"ส่งฟรีที่ล็อบบี้ IDEO MOBI EASTGATE / พื้นที่ใกล้เคียง";
  $("helpTitle").textContent=cms.help_title||"ไม่พบสินค้าที่หาอยู่?";
  $("helpBody").textContent=cms.help_body||"สอบถามสินค้าอื่น เช็กสต๊อก หรือพื้นที่จัดส่งเพิ่มเติมได้เลย";
  ["lineTop","heroLine","helpLine"].forEach(id=>$(id).href=cms.line_url||"https://line.me/R/ti/p/@435ktnsf");
  render(); totals();
}
const getVariants=pid=>variants.filter(v=>v.product_id===pid);
const qtyForProduct=pid=>Object.values(cart).filter(x=>x.product_id===pid).reduce((s,x)=>s+x.qty,0);
const totalStock=pid=>getVariants(pid).reduce((s,v)=>s+(+v.stock||0),0);
function availability(pid){
  const s=totalStock(pid);
  if(s<=0) return {label:"หมดชั่วคราว", cls:"out"};
  if(s<=5) return {label:"เหลือน้อย", cls:"low"};
  return {label:"พร้อมส่ง", cls:"ready"};
}
function visible(){
  const q=$("search").value.toLowerCase().trim();
  return products.filter(p=>(selectedCat==="all"||p.category===selectedCat)&&(!q||`${p.name} ${p.description||""}`.toLowerCase().includes(q))).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
}
function render(){
  const list=visible();
  $("count").textContent=`${list.length} รายการ`;
  $("products").innerHTML=list.map(p=>{
    const vs=getVariants(p.id);
    const q=qtyForProduct(p.id);
    const min=Math.min(...vs.map(v=>+v.price));
    const av=availability(p.id);
    const soldOut=av.cls==="out";
    return `<article class="product-card">
      <div class="thumb">
        <div class="thumb-placeholder">รูปสินค้า</div>
        <span class="availability ${av.cls}">${av.label}</span>
      </div>
      <h4>${p.name}</h4>
      <p>${p.description||""}</p>
      <div class="price">${money(min)}</div>
      <div class="card-actions">
        ${q
          ? `<div class="stepper"><button data-cardminus="${p.id}">−</button><b>${q}</b><button data-cardplus="${p.id}">+</button></div>`
          : `<button class="add" data-add="${p.id}" ${soldOut?"disabled":""}>เพิ่มลงตะกร้า</button>`}
        <button class="buy" data-buy="${p.id}" ${soldOut?"disabled":""}>สั่งซื้อเลย</button>
      </div>
    </article>`;
  }).join("");
}
function totals(){
  const arr=Object.values(cart), qty=arr.reduce((s,x)=>s+x.qty,0), total=arr.reduce((s,x)=>s+x.qty*x.price,0);
  $("cartCount").textContent=qty;$("cartTotal").textContent=money(total);$("sheetTotal").textContent=money(total);
  $("cartBar").classList.toggle("hidden",qty===0);
  $("cartItems").innerHTML=arr.map(x=>`<div class="cart-item"><div><b>${x.product_name}</b><small>${x.variant_label} · ${money(x.price)}</small></div><div class="qty"><button data-minus="${x.variant_id}">−</button><b>${x.qty}</b><button data-plus="${x.variant_id}">+</button></div></div>`).join("")||"ยังไม่มีสินค้า";
}
function addVariant(variant_id,qty=1,replace=false){
  if(replace) cart={};
  const v=variants.find(x=>x.id===variant_id), p=products.find(x=>x.id===v.product_id);
  if(!cart[variant_id]) cart[variant_id]={variant_id,product_id:p.id,product_name:p.name,variant_label:v.label,price:+v.price,qty:0};
  cart[variant_id].qty=Math.min(+v.stock,cart[variant_id].qty+qty);
  totals(); render();
}
function openOption(pid,buy=false){
  const p=products.find(x=>x.id===pid), vs=getVariants(pid).filter(v=>+v.stock>0);
  if(!vs.length) return;
  pending={pid,variant_id:vs[0].id,qty:1,buy};
  $("optionTitle").textContent=p.name;
  $("optionVariants").innerHTML=vs.map((v,i)=>`<button class="${i===0?"active":""}" data-v="${v.id}">${v.label} · ${money(v.price)}</button>`).join("");
  $("optQty").textContent=1;
  $("confirmAdd").textContent = buy ? "ไปหน้าส่งออเดอร์" : "เพิ่มลงตะกร้า";
  calcOpt();
  $("optionSheetWrap").classList.remove("hidden");
}
function calcOpt(){const v=variants.find(x=>x.id===pending.variant_id);$("optTotal").textContent=money(+v.price*pending.qty)}

document.addEventListener("click",e=>{
  const c=e.target.closest("[data-cat]");if(c){selectedCat=c.dataset.cat;document.querySelectorAll("[data-cat]").forEach(x=>x.classList.toggle("active",x===c));render();return}
  const a=e.target.closest("[data-add]");if(a){const vs=getVariants(a.dataset.add).filter(v=>+v.stock>0);if(vs.length>1)openOption(a.dataset.add,false);else if(vs[0])addVariant(vs[0].id);return}
  const b=e.target.closest("[data-buy]");
  if(b){
    const vs=getVariants(b.dataset.buy).filter(v=>+v.stock>0);
    if(vs.length===1){
      addVariant(vs[0].id,1,true);
      $("cartSheetWrap").classList.remove("hidden");
    } else if(vs.length>1){
      openOption(b.dataset.buy,true);
    }
    return
  }
  const v=e.target.closest("[data-v]");if(v&&pending){pending.variant_id=v.dataset.v;document.querySelectorAll("#optionVariants button").forEach(x=>x.classList.toggle("active",x===v));calcOpt();return}
  const pl=e.target.closest("[data-plus]");if(pl){const v=variants.find(x=>x.id===pl.dataset.plus);cart[v.id].qty=Math.min(+v.stock,cart[v.id].qty+1);totals();render();return}
  const mi=e.target.closest("[data-minus]");if(mi){const k=mi.dataset.minus;cart[k].qty--;if(cart[k].qty<1)delete cart[k];totals();render();return}
  const cp=e.target.closest("[data-cardplus]");if(cp){const item=Object.values(cart).find(x=>x.product_id===cp.dataset.cardplus);if(item)addVariant(item.variant_id);return}
  const cm=e.target.closest("[data-cardminus]");if(cm){const item=Object.values(cart).find(x=>x.product_id===cm.dataset.cardminus);if(item){item.qty--;if(item.qty<1)delete cart[item.variant_id];totals();render()}return}
});
$("search").oninput=render;
$("shopNow").onclick=()=>$("productSection").scrollIntoView({behavior:"smooth"});
$("cartBar").onclick=()=>$("cartSheetWrap").classList.remove("hidden");
$("closeCart").onclick=()=>$("cartSheetWrap").classList.add("hidden");
$("closeOption").onclick=()=>{
  $("optionSheetWrap").classList.add("hidden");
  $("confirmAdd").textContent="เพิ่มลงตะกร้า";
};
$("optMinus").onclick=()=>{pending.qty=Math.max(1,pending.qty-1);$("optQty").textContent=pending.qty;calcOpt()};
$("optPlus").onclick=()=>{const v=variants.find(x=>x.id===pending.variant_id);pending.qty=Math.min(+v.stock,pending.qty+1);$("optQty").textContent=pending.qty;calcOpt()};
$("confirmAdd").onclick=()=>{
  const buyNow = !!pending.buy;
  addVariant(pending.variant_id,pending.qty,buyNow);
  $("optionSheetWrap").classList.add("hidden");
  if(buyNow){
    $("cartSheetWrap").classList.remove("hidden");
  }
};
$("deliveryType").onchange=()=>$("nearbyWrap").classList.toggle("hidden",$("deliveryType").value!=="nearby");

$("orderLine").onclick=async()=>{
  clearCheckoutErrors();
  const arr=Object.values(cart);
  if(!arr.length){
    $("checkoutErrorText").textContent="ยังไม่มีสินค้าในออเดอร์";
    $("checkoutError").classList.remove("hidden");
    return;
  }

  const missing=[];
  if(!$("name").value.trim()) missing.push({id:"name",label:"ชื่อผู้สั่ง"});
  if(!$("room").value.trim()) missing.push({id:"room",label:"เลขห้อง"});
  if(!$("phone").value.trim()) missing.push({id:"phone",label:"เบอร์โทร"});
  if($("deliveryType").value==="nearby" && !$("nearbyLocation").value.trim()){
    missing.push({id:"nearbyLocation",label:"สถานที่รับสินค้า"});
  }
  if(missing.length){
    showCheckoutErrors(missing);
    return;
  }

  const customer=await MeeSookStore.createCustomer({name:$("name").value.trim(),room:$("room").value.trim(),phone:$("phone").value.trim()});
  const delivery=$("deliveryType").value==="lobby"?"ล็อบบี้ IDEO MOBI EASTGATE":$("nearbyLocation").value.trim();
  const total=arr.reduce((s,x)=>s+x.price*x.qty,0);
  const result=await MeeSookStore.createOrder({
    order:{customer_id:customer.id,customer_name:customer.name,room:customer.room,phone:customer.phone,pickup_time:$("pickupTime").value.trim(),delivery_type:$("deliveryType").value,delivery_location:delivery,note:$("note").value.trim(),subtotal:total,total,status:"pending",payment_status:"pending",payment_method:"โอนเงิน",channel:"Web"},
    items:arr.map(x=>({variant_id:x.variant_id,product_name:x.product_name,variant_label:x.variant_label,unit_price:x.price,qty:x.qty}))
  });
  const text=[`มีสุขส่งถึง | ออเดอร์ใหม่`,`เลขออเดอร์: ${result.order_no}`,"","รายการสินค้า",...arr.map((x,i)=>`${i+1}. ${x.product_name} (${x.variant_label}) x${x.qty} = ${x.price*x.qty} บาท`),"",`ยอดรวม`,`${total} บาท`,"","ข้อมูลผู้สั่ง",`ชื่อ: ${customer.name}`,`ห้อง: ${customer.room}`,`โทร: ${customer.phone}`,`เวลารับของ: ${$("pickupTime").value.trim()||"-"}`,"","จุดรับสินค้า",delivery,"","หมายเหตุ",$("note").value.trim()||"-"].join("\n");
  location.href=`https://line.me/R/oaMessage/@435ktnsf/?${encodeURIComponent(text)}`;
};

["name","room","phone","nearbyLocation"].forEach(id=>{
  const el=$(id);
  if(!el) return;
  el.addEventListener("input",()=>{
    el.classList.remove("field-error");
    const remaining=["name","room","phone"].filter(x=>!$(x).value.trim());
    if($("deliveryType").value==="nearby" && !$("nearbyLocation").value.trim()) remaining.push("nearbyLocation");
    if(remaining.length===0) clearCheckoutErrors();
  });
});

boot();