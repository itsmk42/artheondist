CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text,
	"actor" text NOT NULL,
	"kind" text NOT NULL,
	"message" text NOT NULL,
	"created" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"product_id" text PRIMARY KEY NOT NULL,
	"quantity" integer,
	"active" integer DEFAULT 1 NOT NULL,
	"updated" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"request_key" text NOT NULL,
	"items" text NOT NULL,
	"consignee" text NOT NULL,
	"phone" text NOT NULL,
	"destination" text NOT NULL,
	"reference" text NOT NULL,
	"notes" text NOT NULL,
	"status" text DEFAULT 'Submitted' NOT NULL,
	"transporter" text DEFAULT '' NOT NULL,
	"consignment" text DEFAULT '' NOT NULL,
	"created" text NOT NULL,
	"updated" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"business" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"role" text DEFAULT 'dealer' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_order" ON "events" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_request_key" ON "orders" USING btree ("user_id","request_key");--> statement-breakpoint
CREATE INDEX "orders_user_created" ON "orders" USING btree ("user_id","created");