import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const users = sqliteTable('users', {
 id:text('id').primaryKey(),email:text('email').notNull(),name:text('name').notNull(),business:text('business').notNull(),phone:text('phone').notNull(),address:text('address').notNull(),role:text('role').notNull().default('dealer'),status:text('status').notNull().default('pending'),created:text('created').notNull(),
});
export const orders = sqliteTable('orders', {
 id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>users.id),requestKey:text('request_key').notNull(),items:text('items').notNull(),consignee:text('consignee').notNull(),phone:text('phone').notNull(),destination:text('destination').notNull(),reference:text('reference').notNull(),notes:text('notes').notNull(),status:text('status').notNull().default('Submitted'),transporter:text('transporter').notNull().default(''),consignment:text('consignment').notNull().default(''),created:text('created').notNull(),updated:text('updated').notNull(),
},table=>[uniqueIndex('order_request_key').on(table.userId,table.requestKey)]);
export const inventory = sqliteTable('inventory', {productId:text('product_id').primaryKey(),quantity:integer('quantity'),active:integer('active').notNull().default(1),updated:text('updated').notNull()});
export const events = sqliteTable('events',{id:text('id').primaryKey(),orderId:text('order_id'),actor:text('actor').notNull(),kind:text('kind').notNull(),message:text('message').notNull(),created:text('created').notNull()});
