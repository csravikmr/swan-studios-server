import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260406054027 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "invoice" ("id" text not null, "display_id" serial, "order_id" text not null, "status" text check ("status" in ('latest', 'stale')) not null default 'latest', "pdf_content" jsonb not null, "payment_id" text null, "generated_at" timestamptz null, "generated_by" text null, "trigger" text not null default 'manual', "file_name" text not null, "file_size" integer null, "email_sent" boolean not null default false, "email_sent_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "invoice_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_invoice_deleted_at" ON "invoice" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "invoice_config" ("id" text not null, "company_name" text not null, "company_address" text not null, "company_phone" text not null, "company_email" text not null, "company_logo" text null, "notes" text null, "auto_generate_on_payment" boolean not null default true, "send_email_with_invoice" boolean not null default true, "email_template_id" text null, "tax_number" text null, "business_number" text null, "payment_terms" text null, "invoice_prefix" text not null default 'INV-', "next_invoice_number" integer not null default 1000, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "invoice_config_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_invoice_config_deleted_at" ON "invoice_config" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "invoice" cascade;`);

    this.addSql(`drop table if exists "invoice_config" cascade;`);
  }

}
