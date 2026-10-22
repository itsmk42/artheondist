import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import catalogue from '../../../lib/catalogue.json';
import type { Member, Line } from '../../../lib/types';
export const dynamic='force-dynamic';
const adminEmail='ballery619@gmail.com';
const products=new Map(catalogue.map(p=>[p.id,p]));
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const now=()=>new Date().toISOString();
const db=()=>{if(!env.DB)throw new Error('Storage is unavailable. Please try again shortly.');return env.DB;};
const event=(actor:string,kind:string,message:string,order:string|null=null)=>db().prepare('INSERT INTO events (id,order_id,actor,kind,message,created) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),order,actor,kind,message,now());
function text(value:unknown,max=300,required=false):string{if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim()))throw new Error('Please complete the required fields within the allowed length.');return value.trim();}
async function context(){const identity=await getChatGPTUser();if(!identity)return {identity:null,user:null};
 if(identity.email?.toLowerCase()===adminEmail)await db().prepare("INSERT OR IGNORE INTO users (id,email,name,business,phone,address,role,status,created) VALUES (?,?,?,?,?,?,'main_admin','approved',?)").bind(identity.userId,identity.email,'Main Admin','Artheon Energy','','',now()).run();
 const user=await db().prepare('SELECT * FROM users WHERE id=?').bind(identity.userId).first<Member>();return {identity,user};}
function requireAdmin(user:Member|null,main=false){if(!user||user.status!=='approved'||(main?user.role!=='main_admin':!['main_admin','staff_admin'].includes(user.role)))throw new Error('You do not have permission for this action.');}
export async function GET(){try{
 const {identity,user}=await context();const state=(await db().prepare('SELECT product_id,active FROM inventory').all<{product_id:string;active:number}>()).results;
 const admin=user?.status==='approved'&&['main_admin','staff_admin'].includes(user.role);const active=new Map(state.map(s=>[s.product_id,s.active]));
 const visible=catalogue.filter(p=>admin||active.get(p.id)!==0).map(p=>({...p,active:active.get(p.id)??1}));
 const orders=user&&(user.status==='approved'||admin)?(await db().prepare(`SELECT orders.*,users.business,users.name AS dealer_name,users.email AS dealer_email FROM orders JOIN users ON users.id=orders.user_id ${admin?'':'WHERE user_id=?'} ORDER BY orders.created DESC LIMIT 500`).bind(...(admin?[]:[user.id])).all()).results:[];
 const dealers=admin?(await db().prepare('SELECT * FROM users ORDER BY created DESC').all()).results:[];
 const inventory=admin?(await db().prepare('SELECT * FROM inventory').all()).results:[];
 const events=user?(await db().prepare(admin?'SELECT * FROM events ORDER BY created DESC LIMIT 1000':'SELECT events.* FROM events JOIN orders ON orders.id=events.order_id WHERE orders.user_id=? ORDER BY events.created DESC LIMIT 1000').bind(...(admin?[]:[user.id])).all()).results:[];
 return json({identity:identity?{userId:identity.userId,email:identity.email}:null,user,products:visible,orders:orders.map(o=>({...o,items:JSON.parse(String(o.items))})),dealers,inventory,events});
}catch(e){console.error(e);return json({error:'The portal could not load. Please try again shortly.'},503);}}
export async function POST(request:Request){try{
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid request origin.'},403);
 const {identity,user}=await context();if(!identity)return json({error:'Please sign in to continue.'},401);
 const raw=await request.text();if(raw.length>40000)return json({error:'Request is too large.'},413);const body=JSON.parse(raw);const action=body.action;
 if(action==='register'){
  if(user)throw new Error('Your account is already registered.');
  await db().batch([db().prepare("INSERT INTO users (id,email,name,business,phone,address,role,status,created) VALUES (?,?,?,?,?,?,'dealer','pending',?)").bind(identity.userId,identity.email,text(body.name,100,true),text(body.business,160,true),text(body.phone,30,true),text(body.address,600,true),now()),event(identity.userId,'dealer','Dealer registration submitted')]);return json({ok:true});
 }
 if(action==='profile'){if(!user||user.status==='suspended')return json({error:'Account updates are not available.'},403);await db().prepare('UPDATE users SET name=?,business=?,phone=?,address=? WHERE id=?').bind(text(body.name,100,true),text(body.business,160,true),text(body.phone,30,true),text(body.address,600,true),user.id).run();return json({ok:true});}
 if(!user||user.status!=='approved')return json({error:'Your dealer account must be approved before continuing.'},403);
 if(action==='submit'){
  if(user.role!=='dealer')throw new Error('Orders must be submitted from a dealer account.');
  const key=text(body.requestKey,80,true);const prior=await db().prepare('SELECT id FROM orders WHERE user_id=? AND request_key=?').bind(user.id,key).first();if(prior)return json({ok:true,id:prior.id});
  if(!Array.isArray(body.items)||!body.items.length||body.items.length>99)throw new Error('Add between 1 and 99 products to your order.');
  const disabled=(await db().prepare('SELECT product_id FROM inventory WHERE active=0').all<{product_id:string}>()).results.map(p=>p.product_id);const seen=new Set<string>();
  const lines:Line[]=body.items.map((line:{productId:string;quantity:number})=>{const p=products.get(line.productId);if(!p||disabled.includes(p.id)||seen.has(p.id)||!Number.isSafeInteger(line.quantity)||line.quantity<1||line.quantity>10000)throw new Error('One or more products or quantities are invalid. Review your cart.');seen.add(p.id);return {productId:p.id,name:p.name,unit:p.unit,quantity:line.quantity};});
  const id='AE-'+crypto.randomUUID().slice(0,12).replace('-','').toUpperCase(),time=now();
  await db().batch([db().prepare("INSERT INTO orders (id,user_id,request_key,items,consignee,phone,destination,reference,notes,status,transporter,consignment,created,updated) VALUES (?,?,?,?,?,?,?,?,?,'Submitted','','',?,?)").bind(id,user.id,key,JSON.stringify(lines),text(body.consignee,160,true),text(body.phone,30,true),text(body.destination,800,true),text(body.reference,100),text(body.notes,1500),time,time),event(user.id,'order','Order submitted; awaiting availability and commercial confirmation.',id)]);return json({ok:true,id});
 }
 if(action==='request-change'){
  const id=text(body.orderId,60,true);const order=await db().prepare('SELECT * FROM orders WHERE id=? AND user_id=?').bind(id,user.id).first();if(!order)throw new Error('Order not found.');if(['Completed','Cancelled','Declined'].includes(String(order.status)))throw new Error('This order is closed.');await event(user.id,'change-request',text(body.message,1000,true),id).run();return json({ok:true});
 }
 if(action==='dealer'){
  requireAdmin(user,true);const id=text(body.userId,200,true);const target=await db().prepare('SELECT * FROM users WHERE id=?').bind(id).first<Member>();if(!target)throw new Error('Account not found.');if(id===user.id)throw new Error('You cannot change your own role or approval.');
  const role=body.role,status=body.status;if(!['dealer','staff_admin','main_admin'].includes(role)||!['pending','approved','suspended'].includes(status))throw new Error('Invalid account settings.');
  await db().batch([db().prepare('UPDATE users SET role=?,status=? WHERE id=?').bind(role,status,id),event(user.id,'access',`${target.email}: ${role}, ${status}`)]);return json({ok:true});
 }
 if(action==='inventory'){
  requireAdmin(user);const id=text(body.productId,30,true);if(!products.has(id))throw new Error('Product not found.');const qty=body.quantity;if(qty!==null&&(!Number.isSafeInteger(qty)||qty<0||qty>10000000))throw new Error('Enter a non-negative whole quantity, or leave unknown.');
  const reason=text(body.reason,500,true);if(typeof body.active!=='boolean')throw new Error('Invalid product visibility.');
  await db().batch([db().prepare('INSERT INTO inventory (product_id,quantity,active,updated) VALUES (?,?,?,?) ON CONFLICT(product_id) DO UPDATE SET quantity=excluded.quantity,active=excluded.active,updated=excluded.updated').bind(id,qty,body.active?1:0,now()),event(user.id,'stock',`${id}: available quantity set to ${qty===null?'unknown':qty}; ${body.active?'visible':'hidden'}. ${reason}`)]);return json({ok:true});
 }
 if(action==='order-status'){
  const id=text(body.orderId,60,true);requireAdmin(user);const order=await db().prepare('SELECT * FROM orders WHERE id=?').bind(id).first();if(!order)throw new Error('Order not found.');const status=text(body.status,40,true),old=String(order.status);
  const next:Record<string,string[]>={'Submitted':['Under review','Confirmed','Declined','Cancelled'],'Under review':['Confirmed','Declined','Cancelled'],'Confirmed':['Preparing','Cancelled'],'Preparing':['Dispatched','Cancelled'],'Dispatched':['Completed'],'Completed':[],'Declined':[],'Cancelled':[]};
  if(status!==old&&!next[old]?.includes(status))throw new Error('This status transition is not available.');if(status!==old&&['Confirmed','Declined','Cancelled'].includes(status))requireAdmin(user,true);
  const transporter=text(body.transporter,160),consignment=text(body.consignment,160),note=text(body.note,1000);
  if(status!==old&&['Confirmed','Declined','Cancelled'].includes(status)&&!note)throw new Error('Add a confirmation or decision note.');if(['Dispatched','Completed'].includes(status)&&(!transporter||!consignment))throw new Error('Add transporter and consignment details before dispatch.');if(String(body.expectedUpdated)!==String(order.updated))throw new Error('This order has changed. Refresh before updating it.');
  const stamp=now();const result=await db().batch([db().prepare('UPDATE orders SET status=?,transporter=?,consignment=?,updated=? WHERE id=? AND updated=?').bind(status,transporter,consignment,stamp,id,order.updated),db().prepare('INSERT INTO events (id,order_id,actor,kind,message,created) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM orders WHERE id=? AND updated=?)').bind(crypto.randomUUID(),id,user.id,'status',`${status}${note?': '+note:''}`,stamp,id,stamp)]);if(!result[0].meta.changes)throw new Error('This order has changed. Refresh before updating it.');return json({ok:true});
 }
 return json({error:'Unknown action.'},400);
}catch(e){return json({error:e instanceof Error?e.message:'Unable to save. Please try again.'},400);}}
