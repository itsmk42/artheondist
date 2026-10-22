"""Local integration checks only. Uses the portable preview identity and local D1 fixture records."""
import json, sqlite3, uuid, urllib.request, urllib.error, http.cookiejar
from pathlib import Path
base='http://127.0.0.1:5173'
jar=http.cookiejar.CookieJar();client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
client.open(base+'/signin-with-chatgpt').read()
def call(payload=None,auth=True,origin=base):
 req=urllib.request.Request(base+'/api/portal', data=json.dumps(payload).encode() if payload is not None else None, headers={'Content-Type':'application/json','Origin':origin})
 try:
  r=(client if auth else urllib.request.build_opener()).open(req);return r.status,json.load(r)
 except urllib.error.HTTPError as e:
  raw=e.read().decode()
  try: data=json.loads(raw)
  except json.JSONDecodeError: data={'error':raw}
  return e.code,data
paths=list(Path('.wrangler/state/v3/d1').rglob('*.sqlite'));db=None
for path in paths:
 c=sqlite3.connect(path)
 if c.execute("SELECT name FROM sqlite_master WHERE name='users'").fetchone():db=c;break
 c.close()
assert db is not None,'Run the local migrations first.'
assert db.execute("SELECT id FROM users WHERE id='local_seedy'").fetchone(),'Register the portable local test identity first.'
original=db.execute("SELECT role,status FROM users WHERE id='local_seedy'").fetchone()
key='integration-'+str(uuid.uuid4());oid=None
other='qa-other-'+str(uuid.uuid4());stamp='2026-10-22T00:00:00.000Z'
checks=[]
def check(name,condition):assert condition,name;checks.append(name);print('PASS',name)
def role(value,status='approved'):
 db.execute("UPDATE users SET role=?,status=? WHERE id='local_seedy'",(value,status));db.commit()
try:
 role('dealer')
 code,state=call();check('all 99 products and own orders only',code==200 and len(state['products'])==99 and all(o['user_id']=='local_seedy' for o in state['orders']))
 check('dealer cannot see inventory or dealer directory',state['inventory']==[] and state['dealers']==[])
 check('catalogue contains no price fields',all(not any('price' in k.lower() for k in p) for p in state['products']))
 check('anonymous writes rejected',call({'action':'submit'},auth=False)[0]==401)
 check('foreign origin rejected',call({'action':'profile'},origin='https://other.example')[0]==403)
 check('dealer cannot change inventory',call({'action':'inventory','productId':'GR-001','quantity':100,'active':True,'reason':'QA'})[0]!=200)
 check('dealer cannot grant roles',call({'action':'dealer','userId':'anyone','role':'main_admin','status':'approved'})[0]!=200)
 payload={'action':'submit','requestKey':key,'items':[{'productId':'GR-001','quantity':2}],'consignee':'Integration test','phone':'9000000000','destination':'Local test only','reference':'QA-INTEGRATION','notes':''}
 code,response=call(payload);oid=response.get('id');check('server saves an order',code==200 and oid is not None)
 code,response=call(payload);check('duplicate retry returns the same order',code==200 and response['id']==oid and db.execute('SELECT COUNT(*) FROM orders WHERE request_key=?',(key,)).fetchone()[0]==1)
 invalid={**payload,'requestKey':str(uuid.uuid4()),'items':[{'productId':'GR-001','quantity':-2}]}
 check('negative quantities rejected',call(invalid)[0]!=200)
 role('dealer','pending');check('pending dealer cannot order',call({**payload,'requestKey':str(uuid.uuid4())})[0]==403)
 role('dealer')
 db.execute("INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?)",(other,'other@example.test','Other','Other business','','','dealer','approved',stamp))
 db.execute("INSERT INTO orders VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",(other,other,other,'[]','Other','','','','','Submitted','','',stamp,stamp));db.commit()
 code,state=call();check('another dealer order is excluded',all(o['id']!=other for o in state['orders']))
 check('another dealer order cannot be changed',call({'action':'request-change','orderId':other,'message':'Unauthorized QA request'})[0]!=200)
 role('staff_admin');check('staff cannot approve orders',call({'action':'order-status','orderId':oid,'status':'Confirmed','transporter':'','consignment':'','note':'QA','expectedUpdated':db.execute('SELECT updated FROM orders WHERE id=?',(oid,)).fetchone()[0]})[0]!=200)
 role('main_admin')
 def update(status,transporter='',consignment='',note='QA transition'):
  version=db.execute('SELECT updated FROM orders WHERE id=?',(oid,)).fetchone()[0]
  return call({'action':'order-status','orderId':oid,'status':status,'transporter':transporter,'consignment':consignment,'note':note,'expectedUpdated':version})
 check('Main Admin can confirm order',update('Confirmed')[0]==200)
 check('Main Admin can prepare order',update('Preparing')[0]==200)
 check('dispatch requires transport details',update('Dispatched')[0]!=200)
 check('transport dispatch saves',update('Dispatched','Local QA Transport','QA-LR-001')[0]==200)
 check('order can be completed',update('Completed','Local QA Transport','QA-LR-001')[0]==200)
 check('closed order cannot return to submitted',update('Submitted')[0]!=200)
 check('stock update creates audit entry',call({'action':'inventory','productId':'GR-099','quantity':9,'active':False,'reason':'QA hidden-stock check'})[0]==200 and db.execute("SELECT COUNT(*) FROM events WHERE kind='stock' AND message LIKE '%QA hidden-stock check%'").fetchone()[0]==1)
 role('dealer');code,state=call();check('hidden product excluded and quantity stays private',all(p['id']!='GR-099' for p in state['products']) and state['inventory']==[])
 check('hidden product cannot be ordered',call({**payload,'requestKey':str(uuid.uuid4()),'items':[{'productId':'GR-099','quantity':1}]})[0]!=200)
 print(f'\n{len(checks)} integration checks passed.')
finally:
 db.execute("UPDATE users SET role=?,status=? WHERE id='local_seedy'",original)
 if oid:db.execute('DELETE FROM events WHERE order_id=?',(oid,));db.execute('DELETE FROM orders WHERE id=?',(oid,))
 db.execute('DELETE FROM orders WHERE id=?',(other,));db.execute('DELETE FROM users WHERE id=?',(other,));db.execute("DELETE FROM inventory WHERE product_id='GR-099'");db.execute("DELETE FROM events WHERE message LIKE '%QA hidden-stock check%'");db.commit();db.close()
