window.MeeSookStore = (() => {
  const KEYS = {
    products: "ms2_products",
    variants: "ms2_variants",
    customers: "ms2_customers",
    orders: "ms2_orders",
    order_items: "ms2_order_items",
    cms: "ms2_cms"
  };
  const clone = x => JSON.parse(JSON.stringify(x));
  let seedCache = null;

  const supabaseReady = () =>
    window.MEESOOK_SUPABASE &&
    window.MEESOOK_SUPABASE.url &&
    window.MEESOOK_SUPABASE.anonKey &&
    !window.MEESOOK_SUPABASE.url.includes("YOUR_");

  async function fetchWithTimeout(url, options={}, timeoutMs=15000){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      return await fetch(url,{...options,signal:controller.signal});
    }catch(error){
      if(error.name==="AbortError") throw new Error("การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง");
      throw error;
    }finally{clearTimeout(timer)}
  }

  async function seed() {
    if (seedCache) return clone(seedCache);
    const res = await fetch("seed.json");
    seedCache = await res.json();
    return clone(seedCache);
  }

  async function ensureLocalSeed() {
    const s = await seed();
    for (const k of ["products","variants","customers","orders","order_items"]) {
      if (!localStorage.getItem(KEYS[k])) localStorage.setItem(KEYS[k], JSON.stringify(s[k]));
    }
    if (!localStorage.getItem(KEYS.cms)) localStorage.setItem(KEYS.cms, JSON.stringify(s.cms));
  }

  async function sbFetch(path, options={}) {
    const cfg = window.MEESOOK_SUPABASE;
    const session = await window.MeeSookAuth?.session?.();
    const url = `${cfg.url}/rest/v1/${path}`;
    const headers = {
      "apikey": cfg.anonKey,
      "Authorization": `Bearer ${session?.access_token || cfg.anonKey}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "return=representation",
      ...(options.headers||{})
    };
    const res = await fetchWithTimeout(url, {...options, headers});
    if (!res.ok) throw new Error(await res.text());
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function list(table, query="select=*") {
    if (supabaseReady()) return sbFetch(`${table}?${query}`, {method:"GET"});
    await ensureLocalSeed();
    return JSON.parse(localStorage.getItem(KEYS[table]) || "[]");
  }

  async function getCms() {
    if (supabaseReady()) {
      const rows = await sbFetch("cms_settings?select=*&key=eq.storefront&limit=1",{method:"GET"});
      return rows?.[0]?.value || {};
    }
    await ensureLocalSeed();
    return JSON.parse(localStorage.getItem(KEYS.cms) || "{}");
  }

  async function saveCms(value) {
    if (supabaseReady()) {
      const rows = await sbFetch("cms_settings?key=eq.storefront", {method:"PATCH", body:JSON.stringify({value, updated_at:new Date().toISOString()})});
      if (!rows?.length) {
        await sbFetch("cms_settings", {method:"POST", body:JSON.stringify({key:"storefront",value})});
      }
      return value;
    }
    localStorage.setItem(KEYS.cms, JSON.stringify(value));
    return value;
  }

  async function upsert(table, row) {
    if (supabaseReady()) {
      return sbFetch(table, {
        method:"POST",
        headers:{"Prefer":"resolution=merge-duplicates,return=representation"},
        body:JSON.stringify(row)
      });
    }
    await ensureLocalSeed();
    const arr = JSON.parse(localStorage.getItem(KEYS[table]) || "[]");
    const i = arr.findIndex(x => x.id === row.id);
    if (i >= 0) arr[i] = {...arr[i], ...row};
    else arr.push(row);
    localStorage.setItem(KEYS[table], JSON.stringify(arr));
    return row;
  }

  async function remove(table, id) {
    if (supabaseReady()) return sbFetch(`${table}?id=eq.${encodeURIComponent(id)}`, {method:"DELETE"});
    await ensureLocalSeed();
    let arr = JSON.parse(localStorage.getItem(KEYS[table]) || "[]");
    arr = arr.filter(x=>x.id!==id);
    localStorage.setItem(KEYS[table], JSON.stringify(arr));
  }

  async function createCustomer(payload) {
    const customer = {
      id: payload.id || crypto.randomUUID(),
      name: payload.name || "",
      room: payload.room || "",
      phone: payload.phone || "",
      line_display_name: payload.line_display_name || "",
      notes: payload.notes || "",
      created_at: payload.created_at || new Date().toISOString()
    };
    await upsert("customers", customer);
    return customer;
  }

  async function createOrder({order, items}) {
    if (supabaseReady()) {
      // Production path: atomic SQL function created by schema.sql
      const cfg = window.MEESOOK_SUPABASE;
      const session = await window.MeeSookAuth?.session?.();
      const res = await fetchWithTimeout(`${cfg.url}/rest/v1/rpc/create_store_order`, {
        method:"POST",
        headers:{
          "apikey":cfg.anonKey,
          "Authorization":`Bearer ${session?.access_token || cfg.anonKey}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({p_order:order,p_items:items})
      });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    }
    await ensureLocalSeed();
    const orders = await list("orders");
    const orderItems = await list("order_items");
    const variants = await list("variants");
    const nextNo = "MS" + String(orders.length + 1).padStart(4,"0");
    const created = {
      id: order.id || crypto.randomUUID(),
      order_no: nextNo,
      ...order,
      created_at: order.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    orders.push(created);
    for (const item of items) {
      orderItems.push({
        id: item.id || crypto.randomUUID(),
        order_id: created.id,
        ...item,
        line_total: Number(item.unit_price) * Number(item.qty)
      });
      const v = variants.find(x=>x.id===item.variant_id);
      if (v) v.stock = Math.max(0, Number(v.stock) - Number(item.qty));
    }
    localStorage.setItem(KEYS.orders, JSON.stringify(orders));
    localStorage.setItem(KEYS.order_items, JSON.stringify(orderItems));
    localStorage.setItem(KEYS.variants, JSON.stringify(variants));
    return {order_id:created.id,order_no:created.order_no};
  }

  async function updateOrder(id, patch) {
    return upsert("orders", {id, ...patch, updated_at:new Date().toISOString()});
  }

  async function deleteOrder(id) {
    if (supabaseReady()) {
      // delete order_items cascades from FK
      return remove("orders", id);
    }
    await ensureLocalSeed();
    await remove("orders", id);
    let items = await list("order_items");
    items = items.filter(x=>x.order_id!==id);
    localStorage.setItem(KEYS.order_items, JSON.stringify(items));
  }

  async function getSnapshot() {
    const [products,variants,customers,orders,order_items,cms] = await Promise.all([
      list("products","select=*&order=sort_order.asc"),
      list("variants"),
      list("customers","select=*&order=created_at.desc"),
      list("orders","select=*&order=created_at.desc"),
      list("order_items"),
      getCms()
    ]);
    return {products,variants,customers,orders,order_items,cms};
  }

  return {
    supabaseReady, seed, ensureLocalSeed, list, getCms, saveCms, upsert, remove,
    createCustomer, createOrder, updateOrder, deleteOrder, getSnapshot
  };
})();
