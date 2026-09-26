const products = window.MEESOOK_PRODUCTS || [];
let selectedCat = "all";
let cart = {};

const $ = id => document.getElementById(id);
const currency = value => `฿${Number(value).toLocaleString("th-TH")}`;

const cartSVG = `
<svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM6.2 5l.57 2H21l-1.8 7.15a2 2 0 0 1-1.94 1.52H9.1a2 2 0 0 1-1.95-1.56L4.11 2H1V0h4.63l.57 2.27L6.2 5Z"/>
</svg>`;

function productTone(category){
  if(category === "water") return "WATER";
  if(category === "rice") return "RICE";
  if(category === "noodle") return "NOODLE";
  return "STORE";
}

function getFilteredProducts(){
  const q = $("search").value.trim().toLowerCase();
  return products.filter(item => {
    const matchCat = selectedCat === "all" || item.category === selectedCat;
    const matchText = !q || item.name.toLowerCase().includes(q) || (item.subtitle || "").toLowerCase().includes(q);
    return matchCat && matchText;
  });
}

function getVariant(productId, variantId){
  const product = products.find(item => item.id === productId);
  const variant = product.variants.find(item => item.id === variantId);
  return [product, variant];
}

function buildProductCard(product){
  const firstVariant = product.variants[0];
  return `
    <article class="product-card" data-id="${product.id}" data-variant="${firstVariant.id}">
      <div class="thumb">
        <span class="thumb-mark">${productTone(product.category)}</span>
        <span class="stock-badge">คงเหลือ ${product.stock}</span>
      </div>

      <h4>${product.name}</h4>
      <div class="product-sub">${product.subtitle || ""}</div>

      <div class="variant-wrap">
        ${product.variants.map((variant, index) => `
          <button class="variant-btn ${index === 0 ? "active" : ""}" type="button" data-variant-btn="${product.id}" data-v="${variant.id}">
            ${variant.label} ${currency(variant.price)}
          </button>
        `).join("")}
      </div>

      <div class="price-block">
        <div>
          <strong>${currency(firstVariant.price)}</strong>
          <span>ต่อ ${firstVariant.label}</span>
        </div>
      </div>

      <div class="action-row">
        <button class="secondary-btn" type="button" data-add="${product.id}">
          ${cartSVG}
          เพิ่มลงตะกร้า
        </button>
        <button class="primary-btn-card" type="button" data-buy-now="${product.id}">
          สั่งซื้อเลย
        </button>
      </div>
    </article>
  `;
}

function renderProducts(){
  const filtered = getFilteredProducts();
  $("count").textContent = `${filtered.length} รายการ`;
  $("products").innerHTML = filtered.map(buildProductCard).join("");
}

function cartItems(){
  return Object.values(cart);
}

function totalItems(){
  return cartItems().reduce((sum, item) => sum + item.qty, 0);
}

function totalPrice(){
  return cartItems().reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function renderCartItems(){
  const items = cartItems();
  $("cartItems").innerHTML = items.length ? items.map(item => `
    <div class="cart-item">
      <div>
        <b>${item.name}</b>
        <div class="item-meta">${item.variantLabel} · ${currency(item.price)} / ${item.variantLabel}</div>
      </div>
      <div class="qty-box">
        <button type="button" data-minus="${item.key}">−</button>
        <strong>${item.qty}</strong>
        <button type="button" data-plus="${item.key}">+</button>
      </div>
    </div>
  `).join("") : `<div class="item-meta" style="padding:8px 0 4px;">ยังไม่มีสินค้าในตะกร้า</div>`;
}

function updateCartUI(){
  $("cartCount").textContent = totalItems();
  $("cartTotal").textContent = currency(totalPrice());
  $("sheetTotal").textContent = currency(totalPrice());
  $("cartBar").classList.toggle("hidden", totalItems() === 0);
  renderCartItems();
}

function addToCart(productId, variantId, qty = 1, replace = false){
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
  cart[key].qty += qty;
  updateCartUI();
}

function openSheet(){
  $("sheetWrap").classList.remove("hidden");
}

function closeSheet(){
  $("sheetWrap").classList.add("hidden");
}

function buildOrderText(orderNo){
  const lines = cartItems().map((item, index) => `${index + 1}. ${item.name} (${item.variantLabel}) x${item.qty} = ${currency(item.price * item.qty)}`);
  const note = $("note").value.trim();
  const pickupTime = $("pickupTime").value.trim();

  return [
    `ออเดอร์จากเว็บไซต์ มีสุขส่งถึง${orderNo ? ` #${orderNo}` : ""}`,
    ``,
    ...lines,
    ``,
    `ยอดรวม ${currency(totalPrice())}`,
    `ชื่อ ${$("name").value.trim()}`,
    `ห้อง ${$("room").value.trim()}`,
    `เบอร์โทร ${$("phone").value.trim()}`,
    pickupTime ? `เวลารับของ ${pickupTime}` : null,
    note ? `หมายเหตุ ${note}` : null,
    ``,
    `ส่งฟรีที่ล็อบบี้ IDEO MOBI EASTGATE`
  ].filter(Boolean).join("\n");
}

document.addEventListener("click", event => {
  const catBtn = event.target.closest("[data-cat]");
  if(catBtn){
    selectedCat = catBtn.dataset.cat;
    document.querySelectorAll("[data-cat]").forEach(button => button.classList.toggle("active", button === catBtn));
    renderProducts();
    return;
  }

  const variantBtn = event.target.closest("[data-variant-btn]");
  if(variantBtn){
    const card = variantBtn.closest(".product-card");
    card.dataset.variant = variantBtn.dataset.v;
    card.querySelectorAll(".variant-btn").forEach(button => button.classList.toggle("active", button === variantBtn));

    const [product, variant] = getVariant(variantBtn.dataset.variantBtn, variantBtn.dataset.v);
    const priceBlock = card.querySelector(".price-block");
    priceBlock.innerHTML = `
      <div>
        <strong>${currency(variant.price)}</strong>
        <span>ต่อ ${variant.label}</span>
      </div>
    `;
    return;
  }

  const addBtn = event.target.closest("[data-add]");
  if(addBtn){
    const card = addBtn.closest(".product-card");
    addToCart(addBtn.dataset.add, card.dataset.variant);
    return;
  }

  const buyNowBtn = event.target.closest("[data-buy-now]");
  if(buyNowBtn){
    const card = buyNowBtn.closest(".product-card");
    addToCart(buyNowBtn.dataset.buyNow, card.dataset.variant, 1, true);
    openSheet();
    return;
  }

  const plusBtn = event.target.closest("[data-plus]");
  if(plusBtn){
    cart[plusBtn.dataset.plus].qty += 1;
    updateCartUI();
    return;
  }

  const minusBtn = event.target.closest("[data-minus]");
  if(minusBtn){
    const key = minusBtn.dataset.minus;
    cart[key].qty -= 1;
    if(cart[key].qty <= 0) delete cart[key];
    updateCartUI();
    return;
  }
});

$("search").addEventListener("input", renderProducts);
$("cartBar").addEventListener("click", openSheet);
$("closeSheet").addEventListener("click", closeSheet);
$("sheetWrap").addEventListener("click", event => {
  if(event.target === $("sheetWrap")) closeSheet();
});

$("orderLine").addEventListener("click", async () => {
  if(!cartItems().length){
    alert("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");
    return;
  }

  if(!$("name").value.trim() || !$("room").value.trim() || !$("phone").value.trim()){
    alert("กรอกชื่อ เลขห้อง และเบอร์โทรก่อนนะคะ");
    return;
  }

  // TODO (Cody):
  // 1) save order + items into Supabase immediately when user clicks 'ส่งออเดอร์'
  // 2) even if LINE open fails or user doesn't add LINE, order should already exist in database
  // 3) return order_no from Supabase
  const orderNo = "";

  const text = buildOrderText(orderNo);
  const lineUrl = `https://line.me/R/oaMessage/@435ktnsf/?${new URLSearchParams({ text }).toString()}`;
  window.location.href = lineUrl;
});

renderProducts();
updateCartUI();