let snap,products=[],variants=[],customers=[],orders=[],orderItems=[],categories=[],cms={},pc={};
let newOrderCart={}, newOrderCustomerMode='existing';
const $=x=>document.getElementById(x),money=n=>'฿'+Number(n).toLocaleString('th-TH'),st={pending:'รอชำระ',paid:'ชำระแล้ว',ready:'พร้อมส่ง',done:'สำเร็จ',cancelled:'ยกเลิก'},ct={water:'น้ำดื่ม',rice:'ข้าวสาร',noodle:'มาม่า',other:'อื่นๆ'};
let confirmResolver=null;
function openConfirm({title="ยืนยันรายการ",text="ต้องการดำเนินการต่อใช่ไหม?",okText="ยืนยัน"}={}){
  $("confirmTitle").textContent=title;
  $("confirmText").textContent=text;
  $("confirmOk").textContent=okText;
  $("confirmModal").classList.remove("hidden");
  return new Promise(resolve=>{confirmResolver=resolve});
}
function closeConfirm(result=false){
  $("confirmModal").classList.add("hidden");
  if(confirmResolver){const r=confirmResolver;confirmResolver=null;r(result)}
}

async function refresh(){snap=await MeeSookStore.getSnapshot();({products,variants,customers,orders,order_items:orderItems,categories,cms}=snap);renderAll()}
function paid(o){return o.payment_status==='paid'||['paid','ready','done'].includes(o.status)}
function renderAll(){fillCategoryOptions();renderCategoryManager();dash();pos();ro();rc();rs();fillCms()}
function fillCategoryOptions(){const select=$('pcat');if(!select)return;select.innerHTML=categories.filter(x=>x.active!==false).map(c=>`<option value="${c.slug}">${c.name}</option>`).join('');}
function renderCategoryManager(){const box=$('categoryList');if(!box)return;box.innerHTML=categories.map(c=>`<div class="category-row"><span><b>${c.name}</b><small>${c.slug} · ลำดับ ${c.sort_order||0}</small></span><span class="category-actions"><button type="button" data-editcategory="${c.id}">แก้ไข</button><button type="button" class="danger" data-delcategory="${c.id}">ลบ</button></span></div>`).join('')||'<div class="row">ยังไม่มีประเภทสินค้า</div>';}
function dash(){let t=new Date().toDateString(),today=orders.filter(x=>new Date(x.created_at).toDateString()===t);$('sales').textContent=money(today.filter(paid).reduce((s,x)=>s+(+x.total||0),0));$('oc').textContent=today.length;$('cc').textContent=customers.length;$('low').textContent=variants.filter(x=>+x.stock<=5).length;$('recent').innerHTML=[...orders].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5).map(x=>`<div class=row><span><b>${x.order_no}</b> · ${x.customer_name||'-'} / ${x.room||'-'}<br><small>${x.channel||'-'} · ${x.payment_method||'-'}</small></span><span><b>${money(x.total)}</b> <i class="tag ${x.status}">${st[x.status]}</i></span></div>`).join('')||'<div class=row>ยังไม่มีออเดอร์</div>';$('lowlist').innerHTML=variants.filter(x=>+x.stock<=5).map(v=>{let p=products.find(x=>x.id===v.product_id);return `<div class=row><span><b>${p?.name||'-'}</b><br><small>${v.label} · ${v.sku||''}</small></span><i class=tag>เหลือ ${v.stock}</i></div>`}).join('')||'<div class=row>สต๊อกยังโอเค</div>';drawSalesChart();drawStatusChart()}
function drawSalesChart(){let c=$('salesChart'),ctx=c.getContext('2d'),W=c.width,H=c.height,pad=42;ctx.clearRect(0,0,W,H);let days=[];for(let i=6;i>=0;i--){let d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);let key=d.toDateString(),sum=orders.filter(o=>new Date(o.created_at).toDateString()===key&&paid(o)).reduce((s,o)=>s+(+o.total||0),0);days.push({d,label:d.toLocaleDateString('th-TH',{day:'numeric',month:'short'}),sum})}let max=Math.max(100,...days.map(x=>x.sum));ctx.strokeStyle='#ddd4c2';ctx.lineWidth=1;for(let i=0;i<5;i++){let y=pad+(H-pad*2)*(i/4);ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-pad,y);ctx.stroke()}ctx.strokeStyle='#3f7a62';ctx.lineWidth=3;ctx.beginPath();days.forEach((x,i)=>{let px=pad+(W-pad*2)*(i/(days.length-1)),py=H-pad-(H-pad*2)*(x.sum/max);if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py)});ctx.stroke();ctx.fillStyle='#3f7a62';days.forEach((x,i)=>{let px=pad+(W-pad*2)*(i/(days.length-1)),py=H-pad-(H-pad*2)*(x.sum/max);ctx.beginPath();ctx.arc(px,py,4,0,Math.PI*2);ctx.fill()});ctx.fillStyle='#7c867e';ctx.font='12px sans-serif';ctx.textAlign='center';days.forEach((x,i)=>{let px=pad+(W-pad*2)*(i/(days.length-1));ctx.fillText(x.label,px,H-13)});}
function drawStatusChart(){let c=$('statusChart'),ctx=c.getContext('2d'),W=c.width,H=c.height,counts=Object.keys(st).map(k=>({k,label:st[k],n:orders.filter(o=>o.status===k).length})),total=Math.max(1,counts.reduce((s,x)=>s+x.n,0)),cx=W*.36,cy=H*.48,r=78,start=-Math.PI/2,colors=['#f2cd58','#4b8a6c','#6680a0','#7aa087','#c96a64'];ctx.clearRect(0,0,W,H);counts.forEach((x,i)=>{let a=(x.n/total)*Math.PI*2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,start,start+a);ctx.closePath();ctx.fillStyle=colors[i];ctx.fill();start+=a});ctx.beginPath();ctx.arc(cx,cy,r*.56,0,Math.PI*2);ctx.fillStyle='#fffdf8';ctx.fill();ctx.fillStyle='#303a34';ctx.font='bold 24px sans-serif';ctx.textAlign='center';ctx.fillText(total,cx,cy+7);ctx.textAlign='left';ctx.font='12px sans-serif';counts.forEach((x,i)=>{let y=45+i*34;ctx.fillStyle=colors[i];ctx.fillRect(W*.66,y-9,12,12);ctx.fillStyle='#303a34';ctx.fillText(`${x.label} ${x.n}`,W*.66+20,y)})}
function pos(){let q=$('search').value.toLowerCase(),rows=variants.map(v=>({v,p:products.find(p=>p.id===v.product_id)})).filter(x=>x.p&&x.p.active!==false&&x.v.active!==false&&`${x.p.name} ${x.v.label}`.toLowerCase().includes(q));$('catalog').innerHTML=rows.map(({p,v})=>`<button class=prod data-pv="${v.id}" ${+v.stock<1?'disabled':''}><strong>${p.name}</strong><span>${v.label} · เหลือ ${v.stock}</span><b>${money(v.price)}</b></button>`).join('');$('cart').innerHTML=Object.values(pc).map(x=>`<div class=row><span><b>${x.product_name}</b><br><small>${x.variant_label} · ${money(x.price)}</small></span><span class=qty><button data-m="${x.variant_id}">−</button><b>${x.qty}</b><button data-a="${x.variant_id}">+</button></span></div>`).join('')||'<div class=row>ยังไม่มีสินค้า</div>';$('total').textContent=money(Object.values(pc).reduce((s,x)=>s+x.price*x.qty,0))}
function ro(){let f=$('filter').value,l=f==='all'?orders:orders.filter(x=>x.status===f);$('ordertable').innerHTML=`<table><tr><th>ออเดอร์</th><th>ลูกค้า</th><th>ห้อง</th><th>ช่องทาง</th><th>ยอด</th><th>สถานะ</th><th></th></tr>${[...l].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map(o=>`<tr><td><b>${o.order_no}</b></td><td>${o.customer_name||'-'}<br><span class=subtle>${o.phone||''}</span></td><td>${o.room||'-'}</td><td>${o.channel||'-'}</td><td>${money(o.total)}</td><td><span class="tag ${o.status}">${st[o.status]}</span></td><td><div class=actions><button data-editorder="${o.id}">แก้ไข</button><button class=danger data-delorder="${o.id}">ลบ</button></div></td></tr>`).join('')}</table>`}
function rc(){
  let q=$('customerSearch').value.toLowerCase().trim(),
      l=customers.filter(c=>!q||`${c.name} ${c.room} ${c.phone}`.toLowerCase().includes(q));
  $('customertable').innerHTML=`<table>
    <tr><th>ลูกค้า</th><th>ห้อง</th><th>เบอร์โทร</th><th>ออเดอร์</th><th>ยอดซื้อรวม</th><th>ล่าสุด</th><th></th></tr>
    ${l.map(c=>{
      let os=orders.filter(o=>o.customer_id===c.id),
          sum=os.filter(paid).reduce((s,o)=>s+(+o.total||0),0),
          last=[...os].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
      return `<tr>
        <td><b>${c.name||'-'}</b></td>
        <td>${c.room||'-'}</td>
        <td>${c.phone||'-'}</td>
        <td>${os.length}</td>
        <td>${money(sum)}</td>
        <td>${last?new Date(last.created_at).toLocaleString('th-TH'):'-'}</td>
        <td><div class="customer-actions">
          <button data-editcustomer="${c.id}">แก้ไข</button>
          <button class="danger" data-delcustomer="${c.id}">ลบ</button>
        </div></td>
      </tr>`
    }).join('')}
  </table>`
}
function rs(){
  $('stocktable').innerHTML=`<table>
    <tr><th><input id="selectAllProducts" type="checkbox" aria-label="เลือกสินค้าทั้งหมด"></th><th>สินค้า</th><th>ประเภทสินค้า</th><th>ตัวเลือก</th><th>SKU</th><th>ราคา</th><th>สต๊อก</th><th></th></tr>
    ${variants.map(v=>{
      let p=products.find(x=>x.id===v.product_id);
      const firstVariant=variants.find(x=>x.product_id===p?.id)?.id===v.id;
      const img=p?.image_url
        ? `<img class="product-thumb-admin" src="${p.image_url}" alt="">`
        : `<span class="product-thumb-admin"></span>`;
      return `<tr>
        <td>${firstVariant&&p?`<input data-product-select="${p.id}" type="checkbox" aria-label="เลือก ${p.name}">`:''}</td>
        <td><div class="product-name-cell">${img}<span><b>${p?.name||'-'}</b><br><span class="subtle">${p?.active===false?'ปิดขาย':'เปิดขาย'}</span></span></div></td>
        <td><span class="category-chip">${categories.find(c=>c.slug===p?.category)?.name||p?.category||'อื่นๆ'}</span></td>
        <td>${v.label}</td>
        <td>${v.sku||'-'}</td>
        <td>${money(v.price)}</td>
        <td><input data-stock="${v.id}" type="number" min="0" value="${v.stock}" style="width:70px"></td>
        <td><button data-editproduct="${p?.id}">แก้ไข</button></td>
      </tr>`
    }).join('')}
  </table>`;
  updateProductSelectionState();
}
function updateProductSelectionState(){
  const selected=document.querySelectorAll('[data-product-select]:checked');
  const button=$('deleteSelectedProducts');
  const categoryButton=$('changeSelectedCategory');
  if(button){button.disabled=!selected.length;button.textContent=selected.length?`ลบที่เลือก (${selected.length})`:'ลบที่เลือก'}
  if(categoryButton){categoryButton.disabled=!selected.length;categoryButton.textContent=selected.length?`เปลี่ยนประเภทที่เลือก (${selected.length})`:'เปลี่ยนประเภทที่เลือก'}
}
function fillCms(){$('hero').value=cms.hero_title||'';$('delivery').value=cms.delivery_copy||'';$('help').value=cms.help_title||'';$('helpBody').value=cms.help_body||'';$('phero').textContent=cms.hero_title||'';$('pdelivery').textContent=cms.delivery_copy||''}
function openCategoryEditor(id=null){const c=id?categories.find(x=>x.id===id):null;$('categoryId').value=c?.id||'';$('categoryName').value=c?.name||'';$('categorySlug').value=c?.slug||'';$('categorySort').value=c?.sort_order??(categories.length+1);$('categoryModalTitle').textContent=c?'แก้ไขประเภทสินค้า':'เพิ่มประเภทสินค้า';$('categoryModal').classList.remove('hidden')}
$('addCategoryBtn').onclick=()=>openCategoryEditor();
$('categoryForm').onsubmit=async e=>{e.preventDefault();const id=$('categoryId').value||crypto.randomUUID(),old=categories.find(x=>x.id===id),name=$('categoryName').value.trim(),slug=$('categorySlug').value.trim().toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'');if(!name||!slug){showToast('กรอกชื่อและรหัสประเภทเป็นภาษาอังกฤษให้ครบ');return}if(categories.some(x=>x.slug===slug&&x.id!==id)){showToast('รหัสประเภทนี้มีอยู่แล้ว');return}if(old&&old.slug!==slug){for(const p of products.filter(x=>x.category===old.slug))await MeeSookStore.upsert('products',{...p,category:slug})}await MeeSookStore.upsert('categories',{...(old||{}),id,name,slug,sort_order:+$('categorySort').value||0,active:true});$('categoryModal').classList.add('hidden');await refresh();showToast(old?'แก้ไขประเภทสินค้าแล้ว':'เพิ่มประเภทสินค้าแล้ว')};
document.addEventListener('click',async e=>{const edit=e.target.closest('[data-editcategory]');if(edit){openCategoryEditor(edit.dataset.editcategory);return}const del=e.target.closest('[data-delcategory]');if(!del)return;const c=categories.find(x=>x.id===del.dataset.delcategory);const used=products.filter(p=>p.category===c.slug).length;if(used){showToast(`ลบไม่ได้ มีสินค้า ${used} รายการใช้ประเภทนี้อยู่`);return}if(await openConfirm({title:'ลบประเภทสินค้า?',text:`ประเภท ${c.name} จะถูกลบออกจากเมนู`,okText:'ลบประเภท'})){await MeeSookStore.remove('categories',c.id);await refresh();showToast('ลบประเภทสินค้าแล้ว')}});


function openCustomerEditor(id){
  const c=customers.find(x=>x.id===id);
  if(!c) return;
  $('ceid').value=c.id;
  $('cname').value=c.name||'';
  $('croom').value=c.room||'';
  $('cphone').value=c.phone||'';
  $('cline').value=c.line_display_name||'';
  $('cnotes').value=c.notes||'';
  $('customerModal').classList.remove('hidden');
}

function renderNewOrderCustomerSelect(){
  $('newOrderCustomer').innerHTML=customers.length
    ? customers.map(c=>`<option value="${c.id}">${c.name||'-'}${c.room?` · ${c.room}`:''}${c.phone?` · ${c.phone}`:''}</option>`).join('')
    : '<option value="">ยังไม่มีลูกค้า</option>';
  renderSelectedCustomerPreview();
}

function renderSelectedCustomerPreview(){
  const c=customers.find(x=>x.id===$('newOrderCustomer').value);
  $('selectedCustomerPreview').textContent=c
    ? `${c.name||'-'} · ห้อง ${c.room||'-'} · ${c.phone||'-'}`
    : 'ยังไม่ได้เลือกลูกค้า';
}

function renderNewOrderProducts(){
  const q=$('newOrderProductSearch').value.toLowerCase().trim();
  const rows=variants.map(v=>({v,p:products.find(p=>p.id===v.product_id)}))
    .filter(({p,v})=>p&&p.active!==false&&v.active!==false&&(!q||`${p.name} ${v.label} ${v.sku||''}`.toLowerCase().includes(q)));
  $('newOrderProducts').innerHTML=rows.map(({p,v})=>`<button type="button" class="order-product-btn" data-neworder-add="${v.id}" ${+v.stock<1?'disabled':''}>
    <strong>${p.name}</strong>
    <small>${v.label} · เหลือ ${v.stock}</small>
    <b>${money(v.price)}</b>
  </button>`).join('');
}

function renderNewOrderCart(){
  const arr=Object.values(newOrderCart);
  $('newOrderItems').innerHTML=arr.map(x=>`<div class="row">
    <span><b>${x.product_name}</b><br><small>${x.variant_label} · ${money(x.price)}</small></span>
    <span class="qty"><button type="button" data-neworder-minus="${x.variant_id}">−</button><b>${x.qty}</b><button type="button" data-neworder-plus="${x.variant_id}">+</button></span>
  </div>`).join('')||'<div class="row">ยังไม่มีสินค้า</div>';
  $('newOrderTotal').textContent=money(arr.reduce((s,x)=>s+x.price*x.qty,0));
}

function openNewOrder(){
  newOrderCart={};
  newOrderCustomerMode='existing';
  document.querySelectorAll('[data-customer-mode]').forEach(b=>b.classList.toggle('active',b.dataset.customerMode==='existing'));
  $('existingCustomerBox').classList.remove('hidden');
  $('newCustomerBox').classList.add('hidden');
  $('newCustomerName').value='';
  $('newCustomerRoom').value='';
  $('newCustomerPhone').value='';
  $('newOrderProductSearch').value='';
  $('newOrderStatus').value='pending';
  $('newOrderPayment').value='โอนเงิน';
  $('newOrderPickupTime').value='';
  $('newOrderDeliveryType').value='lobby';
  $('newOrderLocation').value='ล็อบบี้ IDEO MOBI EASTGATE';
  $('newOrderNote').value='';
  renderNewOrderCustomerSelect();
  renderNewOrderProducts();
  renderNewOrderCart();
  $('newOrderModal').classList.remove('hidden');
}

document.addEventListener('click',async e=>{let n=e.target.closest('[data-v]');if(n){document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x===n));document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===n.dataset.v));$('title').textContent=n.textContent;return}let pv=e.target.closest('[data-pv]');if(pv){let v=variants.find(x=>x.id===pv.dataset.pv),p=products.find(x=>x.id===v.product_id);if(!pc[v.id])pc[v.id]={variant_id:v.id,product_name:p.name,variant_label:v.label,price:+v.price,qty:0};pc[v.id].qty=Math.min(+v.stock,pc[v.id].qty+1);pos();return}let a=e.target.closest('[data-a]');if(a){let v=variants.find(x=>x.id===a.dataset.a);pc[v.id].qty=Math.min(+v.stock,pc[v.id].qty+1);pos();return}let m=e.target.closest('[data-m]');if(m){pc[m.dataset.m].qty--;if(pc[m.dataset.m].qty<1)delete pc[m.dataset.m];pos();return}let eo=e.target.closest('[data-editorder]');if(eo){openOrder(eo.dataset.editorder);return}let del=e.target.closest('[data-delorder]');if(del){let o=orders.find(x=>x.id===del.dataset.delorder);let ok=await openConfirm({title:"ลบออเดอร์?",text:`ออเดอร์ ${o.order_no} จะถูกลบออกจากระบบ และไม่สามารถย้อนกลับได้`,okText:"ลบออเดอร์"});if(ok){await MeeSookStore.deleteOrder(o.id);await refresh()}return}let ec=e.target.closest('[data-editcustomer]');
if(ec){openCustomerEditor(ec.dataset.editcustomer);return}
let dc=e.target.closest('[data-delcustomer]');
if(dc){
  const c=customers.find(x=>x.id===dc.dataset.delcustomer);
  const os=orders.filter(o=>o.customer_id===c.id);
  const ok=await openConfirm({
    title:'ลบข้อมูลลูกค้า?',
    text:os.length
      ? `${c.name||'ลูกค้ารายนี้'} มี ${os.length} ออเดอร์เดิม ออเดอร์จะยังอยู่ แต่ข้อมูล customer master จะถูกลบ`
      : `${c.name||'ลูกค้ารายนี้'} จะถูกลบออกจากรายชื่อลูกค้า`,
    okText:'ลบลูกค้า'
  });
  if(ok){
    await MeeSookStore.remove('customers',c.id);
    await refresh();
    showToast('ลบข้อมูลลูกค้าแล้ว');
  }
  return
}
let ao=e.target.closest('#addOrderBtn');if(ao){openNewOrder();return}
let cmode=e.target.closest('[data-customer-mode]');
if(cmode){
  newOrderCustomerMode=cmode.dataset.customerMode;
  document.querySelectorAll('[data-customer-mode]').forEach(b=>b.classList.toggle('active',b===cmode));
  $('existingCustomerBox').classList.toggle('hidden',newOrderCustomerMode!=='existing');
  $('newCustomerBox').classList.toggle('hidden',newOrderCustomerMode!=='new');
  return
}
let noa=e.target.closest('[data-neworder-add]');
if(noa){
  const v=variants.find(x=>x.id===noa.dataset.neworderAdd),p=products.find(x=>x.id===v.product_id);
  if(!newOrderCart[v.id]) newOrderCart[v.id]={variant_id:v.id,product_name:p.name,variant_label:v.label,price:+v.price,qty:0};
  newOrderCart[v.id].qty=Math.min(+v.stock,newOrderCart[v.id].qty+1);
  renderNewOrderCart();return
}
let nop=e.target.closest('[data-neworder-plus]');
if(nop){
  const v=variants.find(x=>x.id===nop.dataset.neworderPlus);
  newOrderCart[v.id].qty=Math.min(+v.stock,newOrderCart[v.id].qty+1);
  renderNewOrderCart();return
}
let nom=e.target.closest('[data-neworder-minus]');
if(nom){
  const x=newOrderCart[nom.dataset.neworderMinus];x.qty--;if(x.qty<1)delete newOrderCart[x.variant_id];
  renderNewOrderCart();return
}
let ep=e.target.closest('[data-editproduct]');if(ep){openProduct(ep.dataset.editproduct);return}
let dp=e.target.closest('#deleteProductBtn');
if(dp){
  const pid=$('peid').value;
  const p=products.find(x=>x.id===pid);
  const ok=await openConfirm({
    title:'ลบสินค้า?',
    text:`${p?.name||'สินค้านี้'} จะถูกลบพร้อมตัวเลือกทั้งหมด`,
    okText:'ลบสินค้า'
  });
  if(ok){
    await MeeSookStore.remove('products',pid);
    $('productModal').classList.add('hidden');
    await refresh();
    showToast('ลบสินค้าแล้ว');
  }
  return
}let cl=e.target.closest('[data-close]');if(cl){$(cl.dataset.close).classList.add('hidden');return}});
$('search').oninput=pos;$('filter').onchange=ro;$('customerSearch').oninput=rc;
$('dashboardDate').onchange=dash;$('dashboardToday').onclick=()=>{$('dashboardDate').value=localDateKey(new Date());dash()};
$('newOrderCustomer').onchange=renderSelectedCustomerPreview;
$('newOrderProductSearch').oninput=renderNewOrderProducts;
$('newOrderDeliveryType').onchange=()=>{
  const type=$('newOrderDeliveryType').value;
  $('newOrderLocation').value=type==='lobby'?'ล็อบบี้ IDEO MOBI EASTGATE':type==='counter'?'หน้าร้าน':'';
};

$('customerForm').onsubmit=async e=>{
  e.preventDefault();
  const id=$('ceid').value;
  const old=customers.find(x=>x.id===id);
  await MeeSookStore.upsert('customers',{
    ...(old||{}),
    id,
    name:$('cname').value.trim(),
    room:$('croom').value.trim(),
    phone:$('cphone').value.trim(),
    line_display_name:$('cline').value.trim(),
    notes:$('cnotes').value.trim()
  });
  $('customerModal').classList.add('hidden');
  await refresh();
  showToast('บันทึกข้อมูลลูกค้าแล้ว');
};

$('newOrderForm').onsubmit=async e=>{
  e.preventDefault();
  const items=Object.values(newOrderCart);
  if(!items.length){showToast('เพิ่มสินค้าในออเดอร์ก่อน');return}

  let customer;
  if(newOrderCustomerMode==='existing'){
    customer=customers.find(c=>c.id===$('newOrderCustomer').value);
    if(!customer){showToast('เลือกลูกค้าก่อน');return}
  }else{
    const name=$('newCustomerName').value.trim();
    if(!name){showToast('กรอกชื่อลูกค้าใหม่ก่อน');return}
    customer=await MeeSookStore.createCustomer({
      name,
      room:$('newCustomerRoom').value.trim(),
      phone:$('newCustomerPhone').value.trim()
    });
  }

  const total=items.reduce((s,x)=>s+x.price*x.qty,0);
  const status=$('newOrderStatus').value;
  await MeeSookStore.createOrder({
    order:{
      customer_id:customer.id,
      customer_name:customer.name,
      room:customer.room||'',
      phone:customer.phone||'',
      pickup_time:$('newOrderPickupTime').value.trim(),
      delivery_type:$('newOrderDeliveryType').value,
      delivery_location:$('newOrderLocation').value.trim(),
      note:$('newOrderNote').value.trim(),
      subtotal:total,total,
      status,
      payment_status:['paid','ready','done'].includes(status)?'paid':'pending',
      payment_method:$('newOrderPayment').value,
      channel:'Admin'
    },
    items:items.map(x=>({
      variant_id:x.variant_id,
      product_name:x.product_name,
      variant_label:x.variant_label,
      unit_price:x.price,
      qty:x.qty
    }))
  });

  $('newOrderModal').classList.add('hidden');
  await refresh();
  showToast('สร้างออเดอร์แล้ว');
};

$('checkout').onclick=async()=>{
  let items=Object.values(pc);
  if(!items.length){showToast('ยังไม่มีสินค้าในรายการขาย');return}
  let name=$('customer').value.trim()||'ลูกค้าหน้าร้าน';
  let room=$('posRoom').value.trim();
  let phone=$('posPhone').value.trim();
  let customer=await MeeSookStore.createCustomer({name,room,phone});
  let total=items.reduce((s,x)=>s+x.price*x.qty,0);
  await MeeSookStore.createOrder({
    order:{
      customer_id:customer.id,customer_name:name,room,phone,
      pickup_time:'',delivery_type:'counter',delivery_location:'หน้าร้าน',note:'',
      subtotal:total,total,status:'paid',payment_status:'paid',
      payment_method:$('payment').value,channel:'POS'
    },
    items:items.map(x=>({
      variant_id:x.variant_id,product_name:x.product_name,
      variant_label:x.variant_label,unit_price:x.price,qty:x.qty
    }))
  });
  pc={};
  $('customer').value='';
  $('posRoom').value='';
  $('posPhone').value='';
  await refresh();
  showToast('บันทึกการขายแล้ว');
};
$('stocktable').onchange=async e=>{if(e.target.dataset.stock){let v=variants.find(x=>x.id===e.target.dataset.stock);v.stock=Math.max(0,+e.target.value);await MeeSookStore.upsert('variants',v);await refresh()}else if(e.target.dataset.productSelect||e.target.id==='selectAllProducts'){if(e.target.id==='selectAllProducts')document.querySelectorAll('[data-product-select]').forEach(x=>x.checked=e.target.checked);updateProductSelectionState()}};
$('changeSelectedCategory').onclick=()=>{
  const ids=[...document.querySelectorAll('[data-product-select]:checked')].map(x=>x.dataset.productSelect);
  if(!ids.length)return;
  $('bulkCategoryCount').textContent=ids.length;
  $('bulkCategorySelect').innerHTML=categories.filter(x=>x.active!==false).map(c=>`<option value="${c.slug}">${c.name}</option>`).join('');
  $('bulkCategoryModal').classList.remove('hidden');
};
$('bulkCategoryForm').onsubmit=async e=>{
  e.preventDefault();
  const ids=[...document.querySelectorAll('[data-product-select]:checked')].map(x=>x.dataset.productSelect);
  const category=$('bulkCategorySelect').value;
  if(!ids.length||!category)return;
  try{
    for(const id of ids){const p=products.find(x=>x.id===id);if(p)await MeeSookStore.upsert('products',{...p,category})}
    $('bulkCategoryModal').classList.add('hidden');
    await refresh();
    showToast(`เปลี่ยนประเภทสินค้าแล้ว ${ids.length} รายการ`);
  }catch(error){console.error(error);showToast(`เปลี่ยนประเภทไม่สำเร็จ: ${error.message||'กรุณาลองใหม่อีกครั้ง'}`)}
};
$('deleteSelectedProducts').onclick=async()=>{
  const ids=[...document.querySelectorAll('[data-product-select]:checked')].map(x=>x.dataset.productSelect);
  if(!ids.length)return;
  const ok=await openConfirm({title:'ลบสินค้าที่เลือก?',text:`สินค้าที่เลือก ${ids.length} รายการ พร้อมตัวเลือกทั้งหมดจะถูกลบ`,okText:'ลบสินค้า'});
  if(!ok)return;
  for(const id of ids)await MeeSookStore.remove('products',id);
  await refresh();showToast(`ลบสินค้าแล้ว ${ids.length} รายการ`);
};
function openOrder(id){let o=orders.find(x=>x.id===id);$('oeid').value=o.id;$('oname').value=o.customer_name||'';$('oroom').value=o.room||'';$('ophone').value=o.phone||'';$('otime').value=o.pickup_time||'';$('ostatus').value=o.status;$('olocation').value=o.delivery_location||'';$('onote').value=o.note||'';$('orderModal').classList.remove('hidden')}
$('orderForm').onsubmit=async e=>{e.preventDefault();await MeeSookStore.updateOrder($('oeid').value,{customer_name:$('oname').value,room:$('oroom').value,phone:$('ophone').value,pickup_time:$('otime').value,status:$('ostatus').value,payment_status:['paid','ready','done'].includes($('ostatus').value)?'paid':'pending',delivery_location:$('olocation').value,note:$('onote').value});$('orderModal').classList.add('hidden');await refresh()};
let productImageData="";
let productImageFile=null;
let variantImageFiles={};
function variantRow(v={}){
  const id=v.id||crypto.randomUUID();
  return `<div class="variant-edit" data-vid="${id}">
    <input data-f="label" placeholder="เช่น ขวด / แพ็ค" value="${v.label||''}" required>
    <input data-f="price" type="number" min="0" step="0.01" placeholder="ราคา" value="${v.price??''}" required>
    <input data-f="stock" type="number" min="0" placeholder="สต๊อก" value="${v.stock??0}" required>
    <input data-f="sku" placeholder="SKU" value="${v.sku||''}">
    <input data-f="image_url" type="hidden" value="${v.image_url||''}">
    <input data-f="image_scale" type="hidden" value="${v.image_scale||1}">
    <input data-f="image_position" type="hidden" value="${v.image_position||'center'}">
    <button type="button" class="variant-remove" data-removevariant="${id}">×</button>
  </div>`;
}

function variantRows(){return [...document.querySelectorAll('.variant-edit')];}
function switchView(id,label){document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.v===id));document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===id));$('title').textContent=label||document.querySelector(`nav button[data-v="${id}"]`)?.textContent||'';$('mobileNav').value=id}
$('mobileNav').onchange=e=>switchView(e.target.value,e.target.options[e.target.selectedIndex].textContent);
function selectedVariantRow(){return document.querySelector(`.variant-edit[data-vid="${$('variantImageSelect')?.value}"]`)}
function imageOrigin(position){return {center:'50% 50%',top:'50% 0%',bottom:'50% 100%',left:'0% 50%',right:'100% 50%'}[position]||'50% 50%'}
function updateVariantImagePreview(src){
  const preview=$('variantImagePreview');
  if(!preview)return;
  preview.innerHTML=src?`<img src="${src}" alt="variant preview">`:`<span>ยังไม่มีรูป SKU</span>`;
  const img=preview.querySelector('img');
  if(img){img.style.transform=`scale(${$('variantImageScale')?.value||1})`;img.style.objectPosition=$('variantImagePosition')?.value||'center';img.style.transformOrigin=imageOrigin($('variantImagePosition')?.value||'center')}
}
function refreshVariantImageOptions(selectedId){
  const select=$('variantImageSelect');
  if(!select)return;
  const rows=variantRows();
  select.innerHTML=rows.map((row,i)=>{const fields=[...row.querySelectorAll('[data-f]')].reduce((o,x)=>(o[x.dataset.f]=x.value,o),{});return `<option value="${row.dataset.vid}">${fields.label||`ตัวเลือกที่ ${i+1}`}${fields.sku?` · ${fields.sku}`:''}</option>`}).join('');
  select.value=rows.some(x=>x.dataset.vid===selectedId)?selectedId:(rows[0]?.dataset.vid||'');
  loadVariantImageAdjust();
}
function loadVariantImageAdjust(){
  const row=selectedVariantRow();
  if(!row){$('variantImageAdjust').classList.add('hidden');return}
  $('variantImageAdjust').classList.remove('hidden');
  const fields=[...row.querySelectorAll('[data-f]')].reduce((o,x)=>(o[x.dataset.f]=x.value,o),{});
  $('variantImageAdjustTitle').textContent=fields.label||'เลือก SKU เพื่อปรับรูป';
  $('variantImageUrl').value=fields.image_url||'';
  $('variantImageScale').value=fields.image_scale||1;
  $('variantImagePosition').value=fields.image_position||'center';
  $('variantImageFile').value='';
  updateVariantImagePreview(fields.image_url||'');
}
function syncSelectedVariantImage(){
  const row=selectedVariantRow();
  if(!row)return;
  row.querySelector('[data-f="image_url"]').value=$('variantImageUrl').value.trim();
  row.querySelector('[data-f="image_scale"]').value=$('variantImageScale').value||1;
  row.querySelector('[data-f="image_position"]').value=$('variantImagePosition').value||'center';
  updateVariantImagePreview($('variantImageUrl').value.trim());
}

function updateProductImagePreview(){
  const img=$('productImagePreview')?.querySelector('img');
  if(!img)return;
  const position=$('pimagePosition')?.value||'center';
  const origin={center:'50% 50%',top:'50% 0%',bottom:'50% 100%',left:'0% 50%',right:'100% 50%'}[position]||'50% 50%';
  img.style.transform=`scale(${$('pimageScale')?.value||1})`;
  img.style.objectPosition=position;
  img.style.transformOrigin=origin;
}

function renderProductImagePreview(src){
  productImageData=src||"";
  $('productImagePreview').innerHTML=src
    ? `<img src="${src}" alt="product preview">`
    : `<span>ยังไม่มีรูปสินค้า</span>`;
  updateProductImagePreview();
}
async function uploadProductImage(file,pathPrefix){
  const supabaseClient=window.MeeSookAuth?.client?.();
  if(!supabaseClient) throw new Error('ยังไม่ได้เชื่อมต่อ Supabase');
  const safeName=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-');
  const imagePath=`${pathPrefix}/${Date.now()}-${safeName||'product-image'}`;
  const {error}=await supabaseClient.storage.from('product-images').upload(imagePath,file,{upsert:true,contentType:file.type||'image/jpeg'});
  if(error) throw error;
  return supabaseClient.storage.from('product-images').getPublicUrl(imagePath).data.publicUrl;
}

function openProduct(pid=null){
  const isNew=!pid;
  const p=isNew
    ? {id:crypto.randomUUID(),name:'',category:'other',description:'',image_url:'',active:true,sort_order:0}
    : products.find(x=>x.id===pid);

  $('peid').value=p.id;
  $('pname').value=p.name||'';
  $('pcat').value=p.category||categories[0]?.slug||'other';
  $('pdesc').value=p.description||'';
  $('psort').value=p.sort_order??0;
  $('pactive').checked=p.active!==false;
  $('pimageUrl').value=p.image_url||'';
  $('pimageScale').value=p.image_scale||1;
  $('pimagePosition').value=p.image_position||'center';
  $('pimageFile').value='';
  productImageFile=null;
  variantImageFiles={};
  renderProductImagePreview(p.image_url||'');

  const vs=isNew ? [] : variants.filter(x=>x.product_id===pid);
  $('variantEditor').innerHTML=(vs.length?vs:[{id:crypto.randomUUID(),label:'',price:'',stock:0,sku:'',image_url:'',image_scale:1,image_position:'center'}]).map(variantRow).join('');
  refreshVariantImageOptions();

  $('productModalTitle').textContent=isNew?'เพิ่มสินค้า':'แก้ไขสินค้า';
  $('deleteProductBtn').classList.toggle('hidden',isNew);
  $('productModal').classList.remove('hidden');
}

$('addp').onclick=()=>openProduct();
$('pimageScale').oninput=updateProductImagePreview;
$('pimagePosition').onchange=updateProductImagePreview;
$('variantImageSelect').onchange=loadVariantImageAdjust;
$('variantImageScale').oninput=syncSelectedVariantImage;
$('variantImagePosition').onchange=syncSelectedVariantImage;
$('variantImageUrl').oninput=syncSelectedVariantImage;
$('variantImageFile').onchange=e=>{
  const row=selectedVariantRow();const file=e.target.files?.[0];
  if(!row||!file)return;
  variantImageFiles[row.dataset.vid]=file;
  updateVariantImagePreview(URL.createObjectURL(file));
};

const importHeader=(value)=>String(value||'').trim().toLowerCase().replace(/[\s_\-()/]+/g,'');
const importAliases={name:['ชื่อสินค้า','สินค้า','product','productname','name'],label:['ตัวเลือก','ตัวเลือกสินค้า','variant','variantlabel','label','option'],price:['ราคา','price'],stock:['สต๊อก','stock','จำนวน'],sku:['sku','รหัสsku'],category:['หมวด','หมวดหมู่','category'],description:['รายละเอียด','description'],legacy_id:['รหัสสินค้า','รหัสสินค้าเดิม','productid','legacyid'],image_url:['รูปภาพ','รูป','image','imageurl','image_url'],variant_image_url:['รูป SKU','รูปตัวเลือก','variantimage','variant_image_url'],active:['เปิดขาย','active']};
function importValue(row,key){
  const aliases=importAliases[key].map(importHeader);
  const found=Object.keys(row).find(header=>aliases.includes(importHeader(header)));
  return found===undefined?'':row[found];
}
function downloadImportTemplate(){
  const header=['ชื่อสินค้า','ตัวเลือก','ราคา','สต๊อก','SKU','หมวด','รายละเอียด','รหัสสินค้า','รูปภาพสินค้า','รูป SKU'];
  const sample=['น้ำดื่มสิงห์','ขวด','10','20','WATER-01','น้ำดื่ม','ขวด 1.5 ลิตร','','',''];
  const csv=[header,sample].map(row=>row.map(value=>`"${String(value).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob([`\ufeff${csv}`],{type:'text/csv;charset=utf-8'});
  const link=document.createElement('a'); link.href=URL.createObjectURL(blob); link.download='meesook-products-template.csv'; link.click(); URL.revokeObjectURL(link.href);
}
async function importProductsFromExcel(file){
  if(!window.XLSX){showToast('กำลังโหลดตัวอ่าน Excel กรุณาลองใหม่อีกครั้ง');return}
  const workbook=XLSX.read(await file.arrayBuffer(),{type:'array'});
  const sheet=workbook.Sheets[workbook.SheetNames[0]];
  const raw=XLSX.utils.sheet_to_json(sheet,{defval:''});
  const rows=raw.map(row=>({
    name:String(importValue(row,'name')).trim(), label:String(importValue(row,'label')).trim()||'ทั่วไป',
    price:Number(importValue(row,'price')||0), stock:Number(importValue(row,'stock')||0), sku:String(importValue(row,'sku')).trim(),
    category:String(importValue(row,'category')).trim()||'other', description:String(importValue(row,'description')).trim(),
    legacy_id:String(importValue(row,'legacy_id')).trim(), image_url:String(importValue(row,'image_url')).trim(), variant_image_url:String(importValue(row,'variant_image_url')).trim(), active:String(importValue(row,'active')).toLowerCase()!=='false'
  })).filter(row=>row.name);
  if(!rows.length){showToast('ไม่พบแถวสินค้าที่มีชื่อสินค้าในไฟล์');return}
  const groups=new Map();
  rows.forEach(row=>{const key=row.legacy_id||row.name.toLowerCase(); if(!groups.has(key)) groups.set(key,{...row,variants:[]}); groups.get(key).variants.push(row)});
  const approved=await openConfirm({title:'ยืนยันการนำเข้า Excel',text:`พบสินค้า ${groups.size} รายการ และตัวเลือก ${rows.length} รายการ ต้องการบันทึกเข้าฐานข้อมูลหรือไม่?`,okText:'นำเข้า'});
  if(!approved) return;
  try{
    for(const group of groups.values()){
      const existing=products.find(p=>(group.legacy_id&&p.legacy_id===group.legacy_id)||(!group.legacy_id&&p.name===group.name));
      const product={...(existing||{}),id:existing?.id||crypto.randomUUID(),name:group.name,category:group.category,description:group.description,image_url:group.image_url||existing?.image_url||'',active:group.active,sort_order:existing?.sort_order||0};
      if(group.legacy_id) product.legacy_id=group.legacy_id;
      await MeeSookStore.upsert('products',product);
      for(const item of group.variants){
        const old=variants.find(v=>v.product_id===product.id&&(item.sku&&v.sku===item.sku||!item.sku&&v.label===item.label));
        const variant={...(old||{}),id:old?.id||crypto.randomUUID(),product_id:product.id,label:item.label,price:Number.isFinite(item.price)?item.price:0,stock:Number.isFinite(item.stock)?item.stock:0,sku:item.sku||old?.sku||'',image_url:item.variant_image_url||old?.image_url||'',active:true};
        await MeeSookStore.upsert('variants',variant);
      }
    }
    await refresh(); showToast(`นำเข้าสินค้าสำเร็จ ${groups.size} รายการ`);
  }catch(error){console.error(error);showToast(`นำเข้าไม่สำเร็จ: ${error.message||'ตรวจสอบสิทธิ์หรือรูปแบบไฟล์'}`)}
}
$('downloadImportTemplate').onclick=downloadImportTemplate;
$('importProductsFile').onchange=async e=>{const file=e.target.files?.[0];if(file) await importProductsFromExcel(file);e.target.value=''};

$('addVariantBtn').onclick=()=>{
  const id=crypto.randomUUID();
  $('variantEditor').insertAdjacentHTML('beforeend',variantRow({id,label:'',price:'',stock:0,sku:'',image_url:'',image_scale:1,image_position:'center'}));
  refreshVariantImageOptions(id);
};

$('variantEditor').onclick=e=>{
  const btn=e.target.closest('[data-removevariant]');
  if(!btn) return;
  const rows=[...document.querySelectorAll('.variant-edit')];
  if(rows.length<=1){showToast('สินค้าต้องมีอย่างน้อย 1 ตัวเลือก');return}
  delete variantImageFiles[btn.closest('.variant-edit').dataset.vid];
  btn.closest('.variant-edit').remove();
  refreshVariantImageOptions();
};
$('variantEditor').oninput=e=>{
  if(e.target.dataset.f==='label'||e.target.dataset.f==='sku') refreshVariantImageOptions($('variantImageSelect').value);
};

$('pimageUrl').oninput=()=>{
  const url=$('pimageUrl').value.trim();
  if(url) renderProductImagePreview(url);
  else if(!productImageData.startsWith('data:')) renderProductImagePreview('');
};

$('pimageFile').onchange=e=>{
  const file=e.target.files?.[0];
  if(!file) return;
  productImageFile=file;
  const reader=new FileReader();
  reader.onload=()=>{
    renderProductImagePreview(reader.result);
    $('pimageUrl').value='';
  };
  reader.readAsDataURL(file);
};

$('productForm').onsubmit=async e=>{
  e.preventDefault();

  const pid=$('peid').value;
  const existing=products.find(x=>x.id===pid);

  let imageUrl=$('pimageUrl').value.trim()||(!productImageData.startsWith('data:')?productImageData:'');
  if(productImageFile){
    try{imageUrl=await uploadProductImage(productImageFile,pid)}catch(error){showToast(`อัปโหลดรูปไม่สำเร็จ: ${error.message}`);return}
  }

  const product={
    ...(existing||{}),
    id:pid,
    name:$('pname').value.trim(),
    category:$('pcat').value,
    description:$('pdesc').value.trim(),
    image_url:imageUrl,
    image_scale:+$('pimageScale').value||1,
    image_position:$('pimagePosition').value||'center',
    active:$('pactive').checked,
    sort_order:+$('psort').value||0
  };

  if(!product.name){showToast('กรอกชื่อสินค้าก่อน');return}

  const rows=[...document.querySelectorAll('.variant-edit')];
  if(!rows.length){showToast('เพิ่มตัวเลือกสินค้าอย่างน้อย 1 รายการ');return}

  await MeeSookStore.upsert('products',product);

  const existingIds=variants.filter(v=>v.product_id===pid).map(v=>v.id);
  const keptIds=[];

  for(const row of rows){
    const fields=[...row.querySelectorAll('[data-f]')].reduce((o,i)=>(o[i.dataset.f]=i.value,o),{});
    if(!fields.label.trim()){showToast('กรอกชื่อตัวเลือกสินค้าให้ครบ');return}
    const vid=row.dataset.vid||crypto.randomUUID();
    keptIds.push(vid);

    const old=variants.find(v=>v.id===vid);
    let variantImageUrl=fields.image_url.trim()||old?.image_url||'';
    const variantImageFile=variantImageFiles[vid];
    if(variantImageFile){
      try{variantImageUrl=await uploadProductImage(variantImageFile,`${pid}/${vid}`)}catch(error){showToast(`อัปโหลดรูป ${fields.label} ไม่สำเร็จ: ${error.message}`);return}
    }
    await MeeSookStore.upsert('variants',{
      ...(old||{}),
      id:vid,
      product_id:pid,
      label:fields.label.trim(),
      price:+fields.price||0,
      stock:+fields.stock||0,
      sku:fields.sku.trim(),
      image_url:variantImageUrl,
      image_scale:+fields.image_scale||1,
      image_position:fields.image_position||'center',
      active:true
    });
  }

  for(const vid of existingIds.filter(id=>!keptIds.includes(id))){
    await MeeSookStore.remove('variants',vid);
  }

  $('productModal').classList.add('hidden');
  await refresh();
  showToast(existing?'บันทึกการแก้ไขสินค้าแล้ว':'เพิ่มสินค้าแล้ว');
};
$('savecms').onclick=async()=>{
  cms={
    ...cms,
    hero_title:$('hero').value.trim(),
    delivery_copy:$('delivery').value.trim(),
    help_title:$('help').value.trim(),
    help_body:$('helpBody').value.trim()
  };
  await MeeSookStore.saveCms(cms);
  fillCms();
  showToast('บันทึก CMS แล้ว');
};
['hero','delivery'].forEach(id=>$(id).oninput=()=>{
  if(id==='hero') $('phero').textContent=$('hero').value;
  else $('pdelivery').textContent=$('delivery').value;
});

let toastTimer=null;
function showToast(text){
  $('messageText').textContent=text;
  $('messageModal').classList.remove('hidden');
}
$('messageOk').onclick=()=>$('messageModal').classList.add('hidden');
$('messageModal').addEventListener('click',e=>{if(e.target===$('messageModal'))$('messageModal').classList.add('hidden')});

$('confirmCancel').onclick=()=>closeConfirm(false);
$('confirmOk').onclick=()=>closeConfirm(true);
$('confirmModal').addEventListener('click',e=>{if(e.target===$('confirmModal'))closeConfirm(false)});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!$('confirmModal').classList.contains('hidden')) closeConfirm(false);
  if(e.key==='Escape'&&!$('messageModal').classList.contains('hidden')) $('messageModal').classList.add('hidden');
});

const localDateKey=d=>{const x=new Date(d);return new Date(x.getTime()-x.getTimezoneOffset()*60000).toISOString().slice(0,10)};
function dash(){
  const selectedKey=$('dashboardDate').value||localDateKey(new Date());
  $('dashboardDate').value=selectedKey;
  const selectedOrders=orders.filter(x=>localDateKey(x.created_at)===selectedKey);
  const totalSales=orders.filter(paid).reduce((s,x)=>s+(+x.total||0),0);
  $('sales').textContent=money(selectedOrders.filter(paid).reduce((s,x)=>s+(+x.total||0),0));
  $('oc').textContent=selectedOrders.length;
  $('allSales').textContent=money(totalSales);
  $('cc').textContent=customers.length;
  $('low').textContent=variants.filter(x=>+x.stock<=5).length;
  $('recent').innerHTML=[...selectedOrders].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5).map(x=>`<div class=row><span><b>${x.order_no}</b> · ${x.customer_name||'-'} / ${x.room||'-'}<br><small>${x.channel||'-'} · ${x.payment_method||'-'}</small></span><span><b>${money(x.total)}</b> <i class="tag ${x.status}">${st[x.status]}</i></span></div>`).join('')||'<div class=row>ยังไม่มีออเดอร์ในวันที่เลือก</div>';
  $('lowlist').innerHTML=variants.filter(x=>+x.stock<=5).map(v=>{let p=products.find(x=>x.id===v.product_id);return `<div class=row><span><b>${p?.name||'-'}</b><br><small>${v.label} · ${v.sku||''}</small></span><i class=tag>เหลือ ${v.stock}</i></div>`}).join('')||'<div class=row>สต๊อกยังโอเค</div>';
  drawSalesChart();drawStatusChart();
}

async function startAdmin(){
  const gate=$('authGate'), form=$('loginForm'), error=$('loginError');
  const showError=message=>{error.textContent=message;error.classList.remove('hidden')};
  if(!window.MeeSookAuth?.ready()) { showError('ยังไม่ได้ตั้งค่า Supabase ใน supabase-config.js'); return; }
  const session=await window.MeeSookAuth.session();
  if(!session){ gate.classList.remove('hidden'); }
  else {
    gate.classList.add('hidden'); $('adminEmail').textContent=session.user.email||'';
    try { await refresh(); }
    catch(err){ console.error(err); showError('บัญชีนี้ยังไม่มีสิทธิ์ผู้ดูแล หรือโหลดข้อมูลไม่สำเร็จ'); gate.classList.remove('hidden'); }
  }
  form.onsubmit=async e=>{
    e.preventDefault(); error.classList.add('hidden');
    try { await window.MeeSookAuth.signIn($('loginEmail').value.trim(),$('loginPassword').value); location.reload(); }
    catch(err){ showError(err.message||'อีเมลหรือรหัสผ่านไม่ถูกต้อง'); }
  };
  $('logoutBtn').onclick=async()=>{await window.MeeSookAuth.signOut();location.reload()};
}
startAdmin().catch(err=>{ console.error(err); $('loginError').textContent='เกิดข้อผิดพลาดในการเริ่มระบบ'; $('loginError').classList.remove('hidden'); });
