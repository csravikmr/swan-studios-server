import InvoiceModuleService from "./service"
import { Module } from "@medusajs/framework/utils"
import InvoiceConfig from "./models/invoice-config"
import Invoice from "./models/invoice"

export const INVOICE_GENERATOR_MODULE = "invoiceGenerator"

export default Module(INVOICE_GENERATOR_MODULE, {
    service: InvoiceModuleService,
    models: [
        InvoiceConfig,
        Invoice,
    ],
} as any)