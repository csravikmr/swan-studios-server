import { model } from "@medusajs/framework/utils"

const InvoiceConfig = model.define("invoice_config", {
    id: model.id().primaryKey(),
    company_name: model.text(),
    company_address: model.text(),
    company_phone: model.text(),
    company_email: model.text(),
    company_logo: model.text().nullable(),
    notes: model.text().nullable(),
    // Additional fields for auto-generation
    auto_generate_on_payment: model.boolean().default(true),
    send_email_with_invoice: model.boolean().default(true),
    email_template_id: model.text().nullable(),
    // Tax and legal information
    tax_number: model.text().nullable(),
    business_number: model.text().nullable(),
    payment_terms: model.text().nullable(),
    // Invoice numbering
    invoice_prefix: model.text().default("INV-"),
    next_invoice_number: model.number().default(1000),
})

export default InvoiceConfig