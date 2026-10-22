import {config} from 'dotenv';
import {Pool} from 'pg';
import {migrate} from 'drizzle-orm/node-postgres/migrator';
import {drizzle} from 'drizzle-orm/node-postgres';
config({path:process.env.ARTHEON_ENV_FILE||'.env.local',quiet:true});
const url=process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL;
if(!url)throw new Error('DATABASE_URL_UNPOOLED is required for migrations.');
const pool=new Pool({connectionString:url,max:1});
try{await migrate(drizzle(pool),{migrationsFolder:'./drizzle'});console.log('Postgres migrations applied successfully.');}finally{await pool.end();}
