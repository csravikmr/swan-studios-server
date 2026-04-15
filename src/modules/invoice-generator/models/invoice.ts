import { model } from "@medusajs/framework/utils"

export enum InvoiceStatus {
    LATEST = "latest",
    STALE = "stale",
}

const Invoice = model.define("invoice", {
    id: model.id().primaryKey(),
    display_id: model.autoincrement(),
    order_id: model.text(),
    status: model.enum(InvoiceStatus).default(InvoiceStatus.LATEST),
    pdf_content: model.json(),
    // Additional fields for tracking
    payment_id: model.text().nullable(),
    generated_at: model.dateTime().nullable(),
    generated_by: model.text().nullable(), // "system" or user ID
    trigger: model.text().default("manual"), // "payment_capture", "manual", "order_placed"
    // File metadata
    file_name: model.text(),
    file_size: model.number().nullable(),
    // For email tracking
    email_sent: model.boolean().default(false),
    email_sent_at: model.dateTime().nullable(),
})

export default Invoice