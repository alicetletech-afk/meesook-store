let snap,products=[],variants=[],customers=[],orders=[],orderItems=[],cms={},pc={};
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

async function refresh(){snap=await MeeSookStore.getSnapshot();({products,variants,customers,orders,order_items:orderItems,cms}=snap);renderAll()}
function paid(o){return o.payment_status==='paid'||['paid','ready','done'].includes(o.status)}
function renderAll(){dash();pos();ro();rc();rs();fillCms()}
function dash(){let t=new Date().toDateString(),today=orders.filter(x=>new Date(x.created_at).toDateString()===t);$('sales').textContent=money(today.filter(paid).reduce((s,x)=>s+(+x.total||0),0));$('oc').textContent=today.length;$('cc').textContent=customers.length;$('low').textContent=variants.filter(x=>+x.stock<=5).length;$('recent').innerHTML=[...orders].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5).map(x=>`<div class=row><span><b>${x.order_no}</b> · ${x.customer_name||'-'} / ${x.room||'-'}<br><small>${x.channel||'-'} · ${x.payment_method||'-'}</small></span><span><b>${money(x.total)}</b> <i class="tag ${x.status}">${st[x.status]}</i></span></div>`).join('')||'<div class=row>ยังไม่มีออเดอร์</div>';$('lowlist').innerHTML=variants.filter(x=>+x.stock<=5).map(v=>{let p=products.find(x=>x.id===v.product_id);return `<div class=row><span><b>${p?.name||'-'}</b><br><small>${v.label} · ${v.sku||''}</small></span><i class=tag>เหลือ ${v.stock}</i></div>`}).join('')||'<div class=row>สต๊อกยังโอเค</div>';drawSalesChart();drawStatusChart()}
function drawSalesChart(){let c=$('salesChart'),ctx=c.getContext('2d'),W=c.width,H=c.height,pad=42;ctx.clearRect(0,0,W,H);let days=[];for(let i=6;i>=0;i--){let d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);let key=d.toDateString(),sum=orders.filter(o=>new Date(o.created_at).toDateString()===key&&paid(o)).reduce((s,o)=>s+(+o.total||0),0);days.push({d,label:d.toLocaleDateString('th-TH',{day:'numeric',month:'short'}),sum})}let max=Math.max(100,...days.map(x=>x.sum));ctx.strokeStyle='#ddd4c2';ctx.lineWidth=1;for(let i=0;i<5;i++){let y=pad+(H-pad*2)*(i/4);ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-pad,y);ctx.stroke()}ctx.strokeStyle='#3f7a62';ctx.lineWidth=3;ctx.beginPath();days.forEach((x,i)=>{let px=pad+(W-pad*2)*(i/(days.length-1)),py=H-pad-(H-pad*2)*(x.sum/max);if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py)});ctx.stroke();ctx.fillStyle='#3f7a62';days.forEach((x,i)=>{let px=pad+(W-pad*2)*(i/(days.length-1)),py=H-pad-(H-pad*2)*(x.sum/max);ctx.beginPath();ctx.arc(px,py,4,0,Math.PI*2);ctx.fill()});ctx.fillStyle='#7c867e';ctx.font='12px sans-serif';ctx.textAlign='center';days.forEach((x,i)=>{let px=pad+(W-pad*2)*(i/(days.length-1));ctx.fillText(x.label,px,H-13)});}
function drawStatusChart(){let c=$('statusChart'),ctx=c.getContext('2d'),W=c.width,H=c.height,counts=Object.keys(st).map(k=>({k,label:st[k],n:orders.filter(o=>o.status===k).length})),total=Math.max(1,counts.reduce((s,x)=>s+x.n,0)),cx=W*.36,cy=H*.48,r=78,start=-Math.PI/2,colors=['#f2cd58','#4b8a6c','#6680a0','#7aa087','#c96a64'];ctx.clearRect(0,0,W,H);counts.forEach((x,i)=>{let a=(x.n/total)*Math.PI*2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,start,start+a);ctx.closePath();ctx.fillStyle=colors[i];ctx.fill();start+=a});ctx.beginPath();ctx.arc(cx,cy,r*.56,0,Math.PI*2);ctx.fillStyle='#fffdf8';ctx.fill();ctx.fillStyle='#303a34';ctx.font='bold 24px sans-serif';ctx.textAlign='center';ctx.fillText(total,cx,cy+7);ctx.textAlign='left';ctx.font='12px sans-serif';counts.forEach((x,i)=>{let y=45+i*34;ctx.fillStyle=colors[i];ctx.fillRect(W*.66,y-9,12,12);ctx.fillStyle='#303a34';ctx.fillText(`${x.label} ${x.n}`,W*.66+20,y)})}
function pos(){let q=$('search').value.toLowerCase(),rows=variants.map(v=>({v,p:products.find(p=>p.id===v.product_id)})).filter(x=>x.p&&x.p.active!==false&&x.v.active!==false&&`${x.p.name} ${x.v.label}`.toLowerCase().includes(q));$('catalog').innerHTML=rows.map(({p,v})=>`<button class=prod data-pv="${v.id}" ${+v.stock<1?'disabled':''}><strong>${p.name}</strong><span>${v.label} · เหลือ ${v.stock}</span><b>${money(v.price)}</b></button>`).join('');$('cart').innerHTML=Object.values(pc).map(x=>`<div class=row><span><b>${x.product_name}</b><br><small>${x.variant_label} · ${money(x.price)}</small></span><span class=qty><button data-m="${x.variant_id}">−</button><b>${x.qty}</b><button data-a="${x.variant_id}">+</button></span></div>`).join('')||'<div class=row>ยังไม่มีสินค้า</div>';$('total').textContent=money(Object.values(pc).reduce((s,x)=>s+x.price*x.qty,0))}
function ro(){let f=$('filter').value,l=f==='all'?orders:orders.filter(x=>x.status===f);$('ordertable').innerHTML=`<table><tr><th>ออเดอร์</th><th>ลูกค้า</th><th>ห้อง</th><th>ช่องทาง</th><th>ยอด</th><th>สถานะ</th><th></th></tr>${[...l].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map(o=>`<tr><td><b>${o.order_no}</b></td><td>${o.customer_name||'-'}<br><span class=subtle>${o.phone||''}</span></td><td>${o.room||'-'}</td><td>${o.channel||'-'}</td><td>${money(o.total)}</td><td><span class="tag ${o.status}">${st[o.status]}</span></td><td><div class=actions><button data-editorder="${o.id}">แก้ไข</button><button class=danger data-delorder="${o.id}">ลบ</button></div></td></tr>`).join('')}</table>`}
function rc(){let q=$('customerSearch').value.toLowerCase().trim(),l=customers.filter(c=>!q||`${c.name} ${c.room} ${c.phone}`.toLowerCase().includes(q));$('customertable').innerHTML=`<table><tr><th>ลูกค้า</th><th>ห้อง</th><th>เบอร์โทร</th><th>ออเดอร์</th><th>ยอดซื้อรวม</th><th>ล่าสุด</th></tr>${l.map(c=>{let os=orders.filter(o=>o.customer_id===c.id),sum=os.filter(paid).reduce((s,o)=>s+(+o.total||0),0),last=os.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];return `<tr><td><b>${c.name||'-'}</b></td><td>${c.room||'-'}</td><td>${c.phone||'-'}</td><td>${os.length}</td><td>${money(sum)}</td><td>${last?new Date(last.created_at).toLocaleString('th-TH'):'-'}</td></tr>`}).join('')}</table>`}
function rs(){$('stocktable').innerHTML=`<table><tr><th>สินค้า</th><th>ตัวเลือก</th><th>SKU</th><th>ราคา</th><th>สต๊อก</th><th></th></tr>${variants.map(v=>{let p=products.find(x=>x.id===v.product_id);return `<tr><td><b>${p?.name||'-'}</b></td><td>${v.label}</td><td>${v.sku||'-'}</td><td>${money(v.price)}</td><td><input data-stock="${v.id}" type=number min=0 value="${v.stock}" style="width:70px"></td><td><button data-editproduct="${p?.id}">แก้ไข</button></td></tr>`}).join('')}</table>`}
function fillCms(){$('hero').value=cms.hero_title||'';$('delivery').value=cms.delivery_copy||'';$('help').value=cms.help_title||'';$('helpBody').value=cms.help_body||'';$('phero').textContent=cms.hero_title||'';$('pdelivery').textContent=cms.delivery_copy||''}

document.addEventListener('click',async e=>{let n=e.target.closest('[data-v]');if(n){document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x===n));document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===n.dataset.v));$('title').textContent=n.textContent;return}let pv=e.target.closest('[data-pv]');if(pv){let v=variants.find(x=>x.id===pv.dataset.pv),p=products.find(x=>x.id===v.product_id);if(!pc[v.id])pc[v.id]={variant_id:v.id,product_name:p.name,variant_label:v.label,price:+v.price,qty:0};pc[v.id].qty=Math.min(+v.stock,pc[v.id].qty+1);pos();return}let a=e.target.closest('[data-a]');if(a){let v=variants.find(x=>x.id===a.dataset.a);pc[v.id].qty=Math.min(+v.stock,pc[v.id].qty+1);pos();return}let m=e.target.closest('[data-m]');if(m){pc[m.dataset.m].qty--;if(pc[m.dataset.m].qty<1)delete pc[m.dataset.m];pos();return}let eo=e.target.closest('[data-editorder]');if(eo){openOrder(eo.dataset.editorder);return}let del=e.target.closest('[data-delorder]');if(del){let o=orders.find(x=>x.id===del.dataset.delorder);let ok=await openConfirm({title:"ลบออเดอร์?",text:`ออเดอร์ ${o.order_no} จะถูกลบออกจากระบบ และไม่สามารถย้อนกลับได้`,okText:"ลบออเดอร์"});if(ok){await MeeSookStore.deleteOrder(o.id);await refresh()}return}let ep=e.target.closest('[data-editproduct]');if(ep){openProduct(ep.dataset.editproduct);return}let cl=e.target.closest('[data-close]');if(cl){$(cl.dataset.close).classList.add('hidden');return}});
$('search').oninput=pos;$('filter').onchange=ro;$('customerSearch').oninput=rc;
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
$('stocktable').onchange=async e=>{if(e.target.dataset.stock){let v=variants.find(x=>x.id===e.target.dataset.stock);v.stock=Math.max(0,+e.target.value);await MeeSookStore.upsert('variants',v);await refresh()}};
function openOrder(id){let o=orders.find(x=>x.id===id);$('oeid').value=o.id;$('oname').value=o.customer_name||'';$('oroom').value=o.room||'';$('ophone').value=o.phone||'';$('otime').value=o.pickup_time||'';$('ostatus').value=o.status;$('olocation').value=o.delivery_location||'';$('onote').value=o.note||'';$('orderModal').classList.remove('hidden')}
$('orderForm').onsubmit=async e=>{e.preventDefault();await MeeSookStore.updateOrder($('oeid').value,{customer_name:$('oname').value,room:$('oroom').value,phone:$('ophone').value,pickup_time:$('otime').value,status:$('ostatus').value,payment_status:['paid','ready','done'].includes($('ostatus').value)?'paid':'pending',delivery_location:$('olocation').value,note:$('onote').value});$('orderModal').classList.add('hidden');await refresh()};
function openProduct(pid){let p=products.find(x=>x.id===pid),vs=variants.filter(x=>x.product_id===pid);$('peid').value=p.id;$('pname').value=p.name;$('pcat').value=p.category;$('pdesc').value=p.description||'';$('variantEditor').innerHTML=vs.map(v=>`<div class=variant-edit data-vid="${v.id}"><input data-f=label value="${v.label}"><input data-f=price type=number value="${v.price}"><input data-f=stock type=number value="${v.stock}"><input data-f=sku value="${v.sku||''}"></div>`).join('');$('productModal').classList.remove('hidden')}
$('productForm').onsubmit=async e=>{e.preventDefault();let pid=$('peid').value,p=products.find(x=>x.id===pid);await MeeSookStore.upsert('products',{...p,name:$('pname').value,category:$('pcat').value,description:$('pdesc').value});for(const row of document.querySelectorAll('.variant-edit')){let v=variants.find(x=>x.id===row.dataset.vid),fields=[...row.querySelectorAll('[data-f]')].reduce((o,i)=>(o[i.dataset.f]=i.value,o),{});await MeeSookStore.upsert('variants',{...v,label:fields.label,price:+fields.price,stock:+fields.stock,sku:fields.sku})}$('productModal').classList.add('hidden');await refresh()};
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
  $('toastText').textContent=text;
  $('toast').classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),2200);
}

$('confirmCancel').onclick=()=>closeConfirm(false);
$('confirmOk').onclick=()=>closeConfirm(true);
$('confirmModal').addEventListener('click',e=>{if(e.target===$('confirmModal'))closeConfirm(false)});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!$('confirmModal').classList.contains('hidden')) closeConfirm(false);
});

refresh().catch(err=>{
  console.error(err);
  showToast('โหลดข้อมูลไม่สำเร็จ');
});