const products = window.MEESOOK_PRODUCTS || [];
let selectedCat = "all";
let cart = {};

const $ = id => document.getElementById(id);
const money = n => `฿${Number(n).toLocaleString("th-TH")}`;

const cartIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM6.2 5l.57 2H21l-1.8 7.15a2 2 0 0 1-1.94 1.52H9.1a2 2 0 0 1-1.95-1.56L4.11 2H1V0h4.63l.57 2.27L6.2 5Z"/></svg>`;

function tone(category){
  return ({water:"WATER", rice:"RICE", noodle:"NOODLE", other:"STORE"})[category] || "ITEM";
}
function getVariant(productId, variantId){
  const product = products.find(x => x.id === productId);
  const variant = product.variants.find(x => x.id === variantId);
  return [product, variant];
}
function filteredProducts(){
  const q = $("search").value.trim().toLowerCase();
  return products.filter(p => {
    const matchCat = selectedCat === "all" || p.category === selectedCat;
    const matchText = !q || `${p.name} ${p.subtitle || ""}`.toLowerCase().includes(q);
    return matchCat && matchText;
  });
}
function buildCard(product){
  const firstVariant = product.variants[0];
  return `<article class="product-card" data-id="${product.id}" data-variant="${firstVariant.id}">
    <div class="thumb">
      <span class="thumb-mark">${tone(product.category)}</span>
      <span class="stock-badge">คงเหลือ ${product.stock}</span>
    </div>

    <h4>${product.name}</h4>
    <div class="product-sub">${product.subtitle || ""}</div>

    <div class="variant-wrap">
      ${product.variants.map((variant, index) => `
        <button class="variant-btn ${index === 0 ? "active" : ""}" type="button" data-p="${product.id}" data-v="${variant.id}">
          ${variant.label} ${money(variant.price)}
        </button>
      `).join("")}
    </div>

    <div class="price-block">
      <strong>${money(firstVariant.price)}</strong>
      <span>/ ${firstVariant.label}</span>
    </div>

    <div class="action-row">
      <button class="action-btn add-cart" type="button" data-add="${product.id}">
        ${cartIcon}
        <span>เพิ่มลงตะกร้า</span>
      </button>
      <button class="action-btn buy-now" type="button" data-buy="${product.id}">
        <span>สั่งซื้อเลย</span>
      </button>
    </div>
  </article>`;
}
function renderProducts(){
  const items = filteredProducts();
  $("count").textContent = `${items.length} รายการ`;
  $("products").innerHTML = items.map(buildCard).join("");
}
function cartLines(){ return Object.values(cart); }
function cartQty(){ return cartLines().reduce((sum, item) => sum + item.qty, 0); }
function cartTotal(){ return cartLines().reduce((sum, item) => sum + (item.qty * item.price), 0); }

function renderCart(){
  const qty = cartQty();
  $("sheetTotal").textContent = money(cartTotal());
  $("cartFabBadge").textContent = qty;
  $("cartFabBadge").classList.toggle("hidden", qty === 0);

  $("cartItems").innerHTML = qty ? cartLines().map(item => `
    <div class="cart-item">
      <div>
        <b>${item.name}</b>
        <div class="item-meta">${item.variantLabel} · ${money(item.price)} / ${item.variantLabel}</div>
      </div>
      <div class="qty-box">
        <button type="button" data-minus="${item.key}">−</button>
        <strong>${item.qty}</strong>
        <button type="button" data-plus="${item.key}">+</button>
      </div>
    </div>
  `).join("") : `<div class="item-meta" style="padding:8px 0 4px;">ยังไม่มีสินค้าในตะกร้า</div>`;
}
function addToCart(productId, variantId, replace = false){
  const [product, variant] = getVariant(productId, variantId);
  const key = `${productId}__${variantId}`;

  if(replace) cart = {};
  if(!cart[key]){
    cart[key] = {
      key,
      productId,
      variantId,
      name: product.name,
      variantLabel: variant.label,
      price: variant.price,
      qty: 0
    };
  }
  cart[key].qty += 1;
  renderCart();
}
function openCart(){
  $("sheetWrap").classList.remove("hidden");
}
function closeCart(){
  $("sheetWrap").classList.add("hidden");
}

document.addEventListener("click", event => {
  const catBtn = event.target.closest("[data-cat]");
  if(catBtn){
    selectedCat = catBtn.dataset.cat;
    document.querySelectorAll("[data-cat]").forEach(btn => btn.classList.toggle("active", btn === catBtn));
    renderProducts();
    return;
  }

  const variantBtn = event.target.closest("[data-p]");
  if(variantBtn){
    const card = variantBtn.closest(".product-card");
    card.dataset.variant = variantBtn.dataset.v;
    card.querySelectorAll(".variant-btn").forEach(btn => btn.classList.toggle("active", btn === variantBtn));

    const [, variant] = getVariant(variantBtn.dataset.p, variantBtn.dataset.v);
    card.querySelector(".price-block").innerHTML = `<strong>${money(variant.price)}</strong><span>/ ${variant.label}</span>`;
    return;
  }

  const addBtn = event.target.closest("[data-add]");
  if(addBtn){
    const card = addBtn.closest(".product-card");
    addToCart(addBtn.dataset.add, card.dataset.variant);
    return;
  }

  const buyBtn = event.target.closest("[data-buy]");
  if(buyBtn){
    const card = buyBtn.closest(".product-card");
    addToCart(buyBtn.dataset.buy, card.dataset.variant, true);
    openCart();
    return;
  }

  const plusBtn = event.target.closest("[data-plus]");
  if(plusBtn){
    cart[plusBtn.dataset.plus].qty += 1;
    renderCart();
    return;
  }

  const minusBtn = event.target.closest("[data-minus]");
  if(minusBtn){
    const key = minusBtn.dataset.minus;
    cart[key].qty -= 1;
    if(cart[key].qty <= 0) delete cart[key];
    renderCart();
    return;
  }
});

$("search").addEventListener("input", renderProducts);
$("cartFab").addEventListener("click", openCart);
$("closeSheet").addEventListener("click", closeCart);
$("sheetWrap").addEventListener("click", e => {
  if(e.target === $("sheetWrap")) closeCart();
});

function buildOrderText(orderNo){
  const items = cartLines().map((item, index) =>
    `${index + 1}. ${item.name} (${item.variantLabel}) x${item.qty} = ${item.price * item.qty} บาท`
  );

  const note = $("note").value.trim() || "-";
  const pickupTime = $("pickupTime").value.trim() || "-";

  return [
    `คำสั่งซื้อจาก มีสุขส่งถึง`,
    orderNo ? `เลขออเดอร์: ${orderNo}` : null,
    ``,
    `รายการสินค้า`,
    ...items,
    ``,
    `ยอดรวม`,
    `${cartTotal()} บาท`,
    ``,
    `ข้อมูลผู้สั่ง`,
    `ชื่อ: ${$("name").value.trim()}`,
    `ห้อง: ${$("room").value.trim()}`,
    `โทร: ${$("phone").value.trim()}`,
    `เวลารับของ: ${pickupTime}`,
    `หมายเหตุ: ${note}`,
    ``,
    `จัดส่ง`,
    `ส่งฟรีที่ล็อบบี้ IDEO MOBI EASTGATE`,
    `พื้นที่ใกล้เคียงสามารถสอบถามเพิ่มเติมได้`
  ].filter(Boolean).join("\n");
}

$("orderLine").addEventListener("click", async () => {
  if(!cartLines().length){
    alert("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");
    return;
  }
  if(!$("name").value.trim() || !$("room").value.trim() || !$("phone").value.trim()){
    alert("กรอกชื่อ เลขห้อง และเบอร์โทรก่อนนะคะ");
    return;
  }

  // TODO (Cody):
  // 1. save order + order_items into Supabase first
  // 2. return order_no
  // 3. then open LINE
  const orderNo = "";

  const text = buildOrderText(orderNo);
  const lineUrl = `https://line.me/R/oaMessage/@435ktnsf/?${encodeURIComponent(text)}`;
  window.location.href = lineUrl;
});

renderProducts();
renderCart();
