const products = window.MEESOOK_PRODUCTS || [];
let selectedCat = "all";
let cart = {};
const $ = id => document.getElementById(id);
const money = n => `฿${Number(n).toLocaleString("th-TH")}`;
const cartIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM6.2 5l.57 2H21l-1.8 7.15a2 2 0 0 1-1.94 1.52H9.1a2 2 0 0 1-1.95-1.56L4.11 2H1V0h4.63l.57 2.27L6.2 5Z"/></svg>`;

function label(cat){ return ({water:"WATER",rice:"RICE",noodle:"NOODLE",other:"STORE"})[cat] || "ITEM"; }
function getVariant(pid,vid){ const p=products.find(x=>x.id===pid); return [p,p.variants.find(x=>x.id===vid)]; }
function filtered(){
  const q=$("search").value.trim().toLowerCase();
  return products.filter(p => (selectedCat==="all"||p.category===selectedCat) && (!q || `${p.name} ${p.subtitle||""}`.toLowerCase().includes(q)));
}
function renderProducts(){
  const list=filtered();
  $("count").textContent=`${list.length} รายการ`;
  $("products").innerHTML=list.map(p=>{
    const v=p.variants[0];
    return `<article class="product-card" data-id="${p.id}" data-variant="${v.id}">
      <div class="thumb"><span class="thumb-mark">${label(p.category)}</span><span class="stock-badge">เหลือ ${p.stock}</span></div>
      <h4>${p.name}</h4>
      <div class="product-sub">${p.subtitle||""}</div>
      <div class="variant-wrap">${p.variants.map((x,i)=>`<button class="variant-btn ${i===0?"active":""}" type="button" data-p="${p.id}" data-v="${x.id}">${x.label} ${money(x.price)}</button>`).join("")}</div>
      <div class="price-block"><strong>${money(v.price)}</strong><span>/ ${v.label}</span></div>
      <div class="action-row">
        <button class="action-btn add-cart" type="button" data-add="${p.id}">${cartIcon}<span>เพิ่มลงตะกร้า</span></button>
        <button class="action-btn buy-now" type="button" data-buy="${p.id}">สั่งซื้อเลย</button>
      </div>
    </article>`;
  }).join("");
}
function lines(){ return Object.values(cart); }
function qtyTotal(){ return lines().reduce((s,x)=>s+x.qty,0); }
function priceTotal(){ return lines().reduce((s,x)=>s+x.qty*x.price,0); }
function updateCart(){
  const qty=qtyTotal();
  $("cartCount").textContent=qty;
  $("cartTotal").textContent=money(priceTotal());
  $("sheetTotal").textContent=money(priceTotal());
  $("cartBar").classList.toggle("hidden",qty===0);
  $("cartItems").innerHTML = qty ? lines().map(x=>`<div class="cart-item">
    <div><b>${x.name}</b><div class="item-meta">${x.variantLabel} · ${money(x.price)} / ${x.variantLabel}</div></div>
    <div class="qty-box"><button type="button" data-minus="${x.key}">−</button><strong>${x.qty}</strong><button type="button" data-plus="${x.key}">+</button></div>
  </div>`).join("") : `<div class="item-meta" style="padding:8px 0">ยังไม่มีสินค้าในตะกร้า</div>`;
}
function add(pid,vid,replace=false){
  const [p,v]=getVariant(pid,vid), key=`${pid}__${vid}`;
  if(replace) cart={};
  if(!cart[key]) cart[key]={key,pid,vid,name:p.name,variantLabel:v.label,price:v.price,qty:0};
  cart[key].qty++;
  updateCart();
}
function openCart(){ $("sheetWrap").classList.remove("hidden"); }
function closeCart(){ $("sheetWrap").classList.add("hidden"); }

document.addEventListener("click",e=>{
  const cat=e.target.closest("[data-cat]");
  if(cat){selectedCat=cat.dataset.cat;document.querySelectorAll("[data-cat]").forEach(x=>x.classList.toggle("active",x===cat));renderProducts();return;}
  const vb=e.target.closest("[data-p]");
  if(vb){
    const card=vb.closest(".product-card"); card.dataset.variant=vb.dataset.v;
    card.querySelectorAll(".variant-btn").forEach(x=>x.classList.toggle("active",x===vb));
    const [,v]=getVariant(vb.dataset.p,vb.dataset.v);
    card.querySelector(".price-block").innerHTML=`<strong>${money(v.price)}</strong><span>/ ${v.label}</span>`; return;
  }
  const a=e.target.closest("[data-add]"); if(a){const card=a.closest(".product-card");add(a.dataset.add,card.dataset.variant);return;}
  const b=e.target.closest("[data-buy]"); if(b){const card=b.closest(".product-card");add(b.dataset.buy,card.dataset.variant,true);openCart();return;}
  const plus=e.target.closest("[data-plus]"); if(plus){cart[plus.dataset.plus].qty++;updateCart();return;}
  const minus=e.target.closest("[data-minus]"); if(minus){const k=minus.dataset.minus;cart[k].qty--;if(cart[k].qty<=0)delete cart[k];updateCart();return;}
});
$("search").addEventListener("input",renderProducts);
$("shopNow").addEventListener("click",()=>$("productSection").scrollIntoView({behavior:"smooth",block:"start"}));
$("cartBar").addEventListener("click",openCart);
$("closeSheet").addEventListener("click",closeCart);
$("sheetWrap").addEventListener("click",e=>{if(e.target===$("sheetWrap"))closeCart();});

$("deliveryType").addEventListener("change",()=>{
  $("nearbyWrap").classList.toggle("hidden",$("deliveryType").value!=="nearby");
});

function buildOrderText(orderNo){
  const itemLines=lines().map((x,i)=>`${i+1}. ${x.name} (${x.variantLabel}) x${x.qty} = ${x.price*x.qty} บาท`);
  const pickup=$("pickupTime").value.trim()||"-";
  const note=$("note").value.trim()||"-";
  const deliveryType=$("deliveryType").value;
  const deliveryText=deliveryType==="lobby"
    ? "ล็อบบี้ IDEO MOBI EASTGATE"
    : `พื้นที่ใกล้เคียง${$("nearbyLocation").value.trim()?` - ${$("nearbyLocation").value.trim()}`:""}`;

  return [
    `มีสุขส่งถึง | ออเดอร์ใหม่`,
    orderNo ? `เลขออเดอร์: ${orderNo}` : null,
    ``,
    `รายการสินค้า`,
    ...itemLines,
    ``,
    `ยอดรวม`,
    `${priceTotal()} บาท`,
    ``,
    `ข้อมูลผู้สั่ง`,
    `ชื่อ: ${$("name").value.trim()}`,
    `ห้อง: ${$("room").value.trim()}`,
    `โทร: ${$("phone").value.trim()}`,
    `เวลารับของ: ${pickup}`,
    ``,
    `จุดรับสินค้า`,
    deliveryText,
    ``,
    `หมายเหตุ`,
    note
  ].filter(x=>x!==null).join("\n");
}

$("orderLine").addEventListener("click", async()=>{
  if(!lines().length){ alert("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ"); return; }
  if(!$("name").value.trim() || !$("room").value.trim() || !$("phone").value.trim()){
    alert("กรอกชื่อ เลขห้อง และเบอร์โทรก่อนนะคะ"); return;
  }
  if($("deliveryType").value==="nearby" && !$("nearbyLocation").value.trim()){
    alert("กรุณาระบุจุดรับสินค้า"); return;
  }

  // TODO Cody: save order + order_items to Supabase FIRST, then return order_no.
  const orderNo="";

  const text=buildOrderText(orderNo);
  const lineUrl=`https://line.me/R/oaMessage/@435ktnsf/?${encodeURIComponent(text)}`;
  window.location.href=lineUrl;
});

renderProducts();updateCart();
