const products = window.MEESOOK_PRODUCTS;
let selectedCat = "all";
let cart = {};

const el = id => document.getElementById(id);
const money = n => `฿${Number(n).toLocaleString("th-TH")}`;

function renderProducts(){
  const q = el("search").value.trim().toLowerCase();
  const filtered = products.filter(p => (selectedCat==="all" || p.category===selectedCat) && (!q || p.name.toLowerCase().includes(q)));
  el("count").textContent = `${filtered.length} รายการ`;
  el("products").innerHTML = filtered.map(p => {
    const v = p.variants[0];
    return `<article class="card" data-id="${p.id}" data-variant="${v.id}">
      <div class="pic"><span class="stock">เหลือ ${p.stock}</span>${p.emoji}</div>
      <h4>${p.name}</h4><div class="sub">${p.subtitle||""}</div>
      <div class="variants">${p.variants.map((x,i)=>`<button class="variant ${i===0?"active":""}" data-p="${p.id}" data-v="${x.id}">${x.label} ${money(x.price)}</button>`).join("")}</div>
      <div class="buyrow"><div class="price"><b>${money(v.price)}</b><small> / ${v.label}</small></div><button class="add" data-add="${p.id}">+</button></div>
    </article>`;
  }).join("");
}

function getVariant(pid, vid){
  const p = products.find(x=>x.id===pid);
  return [p, p.variants.find(x=>x.id===vid)];
}
function cartLines(){ return Object.values(cart); }
function total(){ return cartLines().reduce((s,x)=>s+x.price*x.qty,0); }
function updateCart(){
  const qty=cartLines().reduce((s,x)=>s+x.qty,0);
  el("cartCount").textContent=qty; el("cartTotal").textContent=money(total()); el("sheetTotal").textContent=money(total());
  el("cartBar").classList.toggle("hidden",qty===0);
  el("cartItems").innerHTML = qty ? cartLines().map(x=>`
    <div class="cart-item">
      <div><b>${x.name}</b><p>${x.variantLabel} · ${money(x.price)} / ${x.variantLabel}</p></div>
      <div class="qty"><button data-minus="${x.key}">−</button><b>${x.qty}</b><button data-plus="${x.key}">+</button></div>
    </div>`).join("") : "<p>ยังไม่มีสินค้าในตะกร้า</p>";
}

document.addEventListener("click", e=>{
  const cat=e.target.closest("[data-cat]");
  if(cat){ selectedCat=cat.dataset.cat; document.querySelectorAll("[data-cat]").forEach(x=>x.classList.toggle("active",x===cat)); renderProducts(); }
  const vr=e.target.closest(".variant");
  if(vr){
    const card=vr.closest(".card"); card.dataset.variant=vr.dataset.v;
    card.querySelectorAll(".variant").forEach(x=>x.classList.toggle("active",x===vr));
    const [p,v]=getVariant(vr.dataset.p,vr.dataset.v);
    card.querySelector(".price").innerHTML=`<b>${money(v.price)}</b><small> / ${v.label}</small>`;
  }
  const add=e.target.closest("[data-add]");
  if(add){
    const card=add.closest(".card"), pid=add.dataset.add, vid=card.dataset.variant;
    const [p,v]=getVariant(pid,vid), key=`${pid}__${vid}`;
    cart[key] = cart[key] || {key,pid,vid,name:p.name,variantLabel:v.label,price:v.price,qty:0};
    cart[key].qty++; updateCart();
  }
  const plus=e.target.closest("[data-plus]"); if(plus){cart[plus.dataset.plus].qty++;updateCart()}
  const minus=e.target.closest("[data-minus]"); if(minus){const k=minus.dataset.minus;cart[k].qty--;if(cart[k].qty<=0)delete cart[k];updateCart()}
});
el("search").addEventListener("input",renderProducts);
el("cartBar").onclick=()=>el("sheetWrap").classList.remove("hidden");
el("closeSheet").onclick=()=>el("sheetWrap").classList.add("hidden");
el("sheetWrap").addEventListener("click",e=>{if(e.target===el("sheetWrap"))el("sheetWrap").classList.add("hidden")});

function buildOrderText(orderNo){
  const lines = cartLines().map((x,i)=>`${i+1}. ${x.name} (${x.variantLabel}) x${x.qty} = ${money(x.price*x.qty)}`);
  const note = el("note").value.trim();
  return [
    `🛒 มีสุขส่งถึง — ออเดอร์${orderNo ? " #"+orderNo : ""}`,
    ``,
    ...lines,
    ``,
    `💰 ยอดรวม ${money(total())}`,
    `👤 ชื่อ: ${el("name").value.trim()}`,
    `🏠 ห้อง: ${el("room").value.trim()}`,
    `📞 โทร: ${el("phone").value.trim()}`,
    note ? `📝 หมายเหตุ: ${note}` : null,
    ``,
    `🚚 ส่งฟรีที่ล็อบบี้`
  ].filter(Boolean).join("\n");
}

el("orderLine").onclick = async ()=>{
  if(!cartLines().length) return;
  if(!el("name").value.trim() || !el("room").value.trim() || !el("phone").value.trim()){
    alert("กรอกชื่อ ห้อง และเบอร์โทรก่อนนะคะ 💛"); return;
  }

  // TODO (Cody): INSERT order + order_items into Supabase here first.
  // Example:
  // const savedOrder = await saveOrderToSupabase({...});
  // const orderNo = savedOrder.order_no;
  const orderNo = "";

  const text = buildOrderText(orderNo);
  const lineUrl = `https://line.me/R/oaMessage/@435ktnsf/?${new URLSearchParams({text}).toString()}`;
  window.location.href = lineUrl;
};

renderProducts(); updateCart();