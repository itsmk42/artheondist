import 'server-only';
import { Pool, type QueryResultRow } from 'pg';
import { attachDatabasePool } from '@vercel/functions';
let pool:Pool|undefined;
export function getPool(){
 if(!pool){if(!process.env.DATABASE_URL)throw new Error('Database is not configured.');const connection=new URL(process.env.DATABASE_URL);connection.searchParams.set('sslmode','verify-full');pool=new Pool({connectionString:connection.toString(),max:5,idleTimeoutMillis:5000,connectionTimeoutMillis:15000});attachDatabasePool(pool);}
 return pool;
}
// A small prepared-query adapter preserves the portal's parameterized SQL and atomic batches.
export class Statement {
 constructor(readonly sql:string,readonly values:unknown[]=[]){ }
 bind(...values:unknown[]){return new Statement(this.sql,values);}
 get query(){let n=0;return this.sql.replace(/\?/g,()=>`$${++n}`);}
 async all<T=QueryResultRow>(){const r=await getPool().query(this.query,this.values);return {results:r.rows as T[],meta:{changes:r.rowCount??0}};}
 async first<T=QueryResultRow>():Promise<T|null>{return (await this.all<T>()).results[0]??null;}
 async run(){return this.all();}
}
export const database={
 prepare(sql:string){return new Statement(sql);},
 async batch(statements:Statement[]){const client=await getPool().connect();try{await client.query('BEGIN');const results=[];for(const s of statements){const r=await client.query(s.query,s.values);results.push({results:r.rows,meta:{changes:r.rowCount??0}});}await client.query('COMMIT');return results;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
};
