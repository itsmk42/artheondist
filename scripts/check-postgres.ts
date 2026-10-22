import {config} from 'dotenv';
import {Pool} from 'pg';
import {createClerkClient} from '@clerk/backend';
import assert from 'node:assert/strict';
config({path:'.env.local',quiet:true});
const base='http://localhost:3037';
if(!process.env.CLERK_SECRET_KEY?.startsWith('sk_test_'))throw new Error('Integration checks require a Clerk development instance.');
const clerk=createClerkClient({secretKey:process.env.CLERK_SECRET_KEY});
const connection=new URL(process.env.DATABASE_URL!);connection.searchParams.set('sslmode','verify-full');
const pool=new Pool({connectionString:connection.toString(),max:2});
const created:string[]=[];const prefix='artheon-qa-'+Date.now();let passed=0;let stockFixture=false;
function check(name:string,condition:unknown){assert.ok(condition,name);passed++;console.log('PASS',name);}
async function identity(suffix:string,verified=true){const u=await clerk.users.createUser({emailAddress:[`${prefix}-${suffix}+clerk_test@example.com`],emailAddressIdentificationStatus:[verified?'verified':'reserved'],firstName:'Integration',lastName:'Test',skipPasswordRequirement:true});created.push(u.id);const session=await clerk.sessions.createSession({userId:u.id});const token=await clerk.sessions.getToken(session.id);return {id:u.id,token:token.jwt};}
async function call(who:{token:string}|null,payload?:Record<string,unknown>,headers:Record<string,string>={}){const r=await fetch(base+'/api/portal',{method:payload?'POST':'GET',headers:{...(who?{Authorization:'Bearer '+who.token}:{}),...(payload?{'Content-Type':'application/json',Origin:base}:{}),...headers},...(payload?{body:JSON.stringify(payload)}:{})});const raw=await r.text();let data:any;try{data=JSON.parse(raw);}catch{throw new Error(`Unexpected ${r.status} response: ${raw.slice(0,160)}`);}return {status:r.status,data};}
try{
 const anon=await call(null);check('anonymous catalogue loads 99 products',anon.status===200&&anon.data.products.length===99);
 check('anonymous users cannot mutate orders',(await call(null,{action:'submit'})).status===401);
 const spoof=await call(null,undefined,{'oai-authenticated-user-id':'local_seedy','oai-authenticated-user-email':'ballery619@gmail.com'});check('old platform identity headers cannot grant access',spoof.data.identity===null&&spoof.data.user===null);
 const a=await identity('a'),b=await identity('b');
 const register=(name:string)=>({action:'register',name,business:prefix,phone:'9000000000',address:'Local integration test only',role:'main_admin'});
 check('registration uses verified Clerk session',(await call(a,register('QA A'))).status===200);
 check('dealer cannot self-assign Main Admin',(await call(a)).data.user.role==='dealer');
 const payload={action:'submit',requestKey:prefix,items:[{productId:'GR-001',quantity:2}],consignee:'QA consignee',phone:'9000000000',destination:'Integration test only',reference:prefix,notes:''};
 check('pending dealer cannot order',(await call(a,payload)).status===403);
 await pool.query("UPDATE users SET status='approved' WHERE id=$1",[a.id]);
 const placed=await call(a,payload),oid=placed.data.id;check('approved dealer can submit and persist an order',placed.status===200&&typeof oid==='string');
 check('duplicate retries return the same order',(await call(a,payload)).data.id===oid);
 check('invalid quantity is rejected',(await call(a,{...payload,requestKey:prefix+'-bad',items:[{productId:'GR-001',quantity:-1}]})).status!==200);
 check('dealer cannot adjust inventory',(await call(a,{action:'inventory',productId:'GR-001',quantity:3,active:true,reason:prefix})).status!==200);
 check('dealer cannot grant access',(await call(a,{action:'dealer',userId:a.id,role:'main_admin',status:'approved'})).status!==200);
 await call(b,register('QA B'));await pool.query("UPDATE users SET status='approved' WHERE id=$1",[b.id]);
 const other=await call(b);check('dealer cannot read another dealer orders',other.data.orders.length===0&&other.data.dealers.length===0&&other.data.inventory.length===0);
 check('dealer cannot amend another dealer order',(await call(b,{action:'request-change',orderId:oid,message:'QA unauthorized'})).status!==200);
 await pool.query("UPDATE users SET role='staff_admin' WHERE id=$1",[a.id]);
 let order=(await call(a)).data.orders.find((o:any)=>o.id===oid);
 const update=(status:string,extra={})=>({action:'order-status',orderId:oid,status,expectedUpdated:order.updated,transporter:'',consignment:'',note:prefix,...extra});
 check('Staff Admin cannot confirm an order',(await call(a,update('Confirmed'))).status!==200);
 await pool.query("UPDATE users SET role='main_admin' WHERE id=$1",[a.id]);
 check('Main Admin can confirm',(await call(a,update('Confirmed'))).status===200);order=(await call(a)).data.orders.find((o:any)=>o.id===oid);
 check('Main Admin can prepare',(await call(a,update('Preparing'))).status===200);order=(await call(a)).data.orders.find((o:any)=>o.id===oid);
 check('dispatch requires transporter and consignment',(await call(a,update('Dispatched'))).status!==200);
 check('dispatch details persist',(await call(a,update('Dispatched',{transporter:'QA transport',consignment:'QA-LR'}))).status===200);order=(await call(a)).data.orders.find((o:any)=>o.id===oid);
 check('stale edits are rejected',(await call(a,{...update('Completed',{transporter:'QA transport',consignment:'QA-LR'}),expectedUpdated:'stale'})).status!==200);
 check('order completes',(await call(a,update('Completed',{transporter:'QA transport',consignment:'QA-LR'}))).status===200);
 const history=await pool.query('SELECT * FROM events WHERE order_id=$1',[oid]);check('order history is audited',history.rows.length>=5);
 const existingStock=await pool.query('SELECT * FROM inventory WHERE product_id=$1',['GR-099']);
 if(existingStock.rows.length===0){
  stockFixture=true;
  check('Main Admin stock adjustment persists',(await call(a,{action:'inventory',productId:'GR-099',quantity:9,active:false,reason:prefix})).status===200);
  const dealerView=await call(b);check('stock stays private and hidden products are removed',dealerView.data.inventory.length===0&&!dealerView.data.products.some((p:any)=>p.id==='GR-099'));
  check('hidden product cannot be ordered',(await call(b,{...payload,requestKey:prefix+'-hidden',items:[{productId:'GR-099',quantity:1}]})).status!==200);
 }
 check('new backend contains no price fields',Object.keys((await call(b)).data.products[0]).every(k=>!k.toLowerCase().includes('price')));
 console.log(`\n${passed} Postgres + Clerk integration checks passed.`);
}finally{
 if(stockFixture)await pool.query('DELETE FROM inventory WHERE product_id=$1',['GR-099']);
 if(created.length){await pool.query('DELETE FROM events WHERE actor=ANY($1::text[])',[created]);await pool.query('DELETE FROM orders WHERE user_id=ANY($1::text[])',[created]);await pool.query('DELETE FROM users WHERE id=ANY($1::text[])',[created]);for(const id of created)await clerk.users.deleteUser(id);}
 await pool.end();console.log('Temporary test identities and database fixtures removed.');
}
