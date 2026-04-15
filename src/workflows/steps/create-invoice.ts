import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INVOICE_GENERATOR_MODULE } from "../../modules/invoice-generator"
import InvoiceModuleService from "../../modules/invoice-generator/service"
import { MedusaError } from "@medusajs/framework/utils"
import { InvoiceStatus } from "../../modules/invoice-generator/models/invoice"

export type CreateInvoiceStepInput = {
    order_id: string
    payment_id?: string
    trigger?: string
    generated_by?: string
    order?: any
    items?: any[]
}

export const createInvoiceStep = createStep(
    "create-invoice-step",
    async (input: CreateInvoiceStepInput, { container }) => {
        const invoiceService: InvoiceModuleService =
            container.resolve(INVOICE_GENERATOR_MODULE)
        const query = container.resolve("query")

        // Get or create invoice config
        let invoiceConfigs = await invoiceService.listInvoiceConfigs({})
        let config = invoiceConfigs[0]

        // If no config exists, create a default one
        if (!config) {
            const createdConfigs = await invoiceService.createInvoiceConfigs([{
                company_name: "Swan Studios",
                company_address: "123 Business Street, City, Country",
                company_phone: "+1 (555) 123-4567",
                company_email: "billing@swanstudios.com",
                auto_generate_on_payment: true,
                send_email_with_invoice: false,
                invoice_prefix: "INV-",
                next_invoice_number: 1000,
            }])
            config = createdConfigs[0]
            invoiceConfigs = [config]
        }

        const invoicePrefix = config.invoice_prefix || "INV-"
        const nextInvoiceNumber = config.next_invoice_number || 1000
        const displayNumber = nextInvoiceNumber

        // Prepare order data for PDF content
        let order = input.order
        let items = input.items

        // If order data is not provided, fetch it using the Split Fetch Strategy for Medusa v2
        if (!order || !items) {
            console.log(`[Create Invoice Step] Fetching order data for ${input.order_id}...`)
            
            // Fetch 1: Relations
            const { data: ordersBasic } = await query.graph({
                entity: "order",
                fields: ["id", "display_id", "currency_code", "created_at", "items.*", "summary.*", "shipping_address.*", "billing_address.*", "shipping_methods.*"],
                filters: { id: input.order_id }
            })

            // Fetch 2: Totals
            const { data: ordersTotals } = await query.graph({
                entity: "order",
                fields: ["id", "item_subtotal", "shipping_subtotal", "tax_total", "total", "discount_total"],
                filters: { id: input.order_id }
            })

            if (ordersBasic?.[0] && ordersTotals?.[0]) {
                order = { ...ordersBasic[0], ...ordersTotals[0] }
                items = order.items || []
            }
        }

        // Generate PDF content (doc definition) to be stored in the database
        let pdfContent = {}
        if (order && items) {
            // @ts-ignore - access internal method for doc definition
            pdfContent = await (invoiceService as any).createInvoiceContent({
                order: order,
                items: items
            })
            console.log(`[Create Invoice Step] Generated PDF content for ${input.order_id}`)
        }

        // Create the invoice record with populated PDF content
        const createdInvoice = await invoiceService.createInvoices([{
            order_id: input.order_id,
            payment_id: input.payment_id,
            trigger: input.trigger || "manual",
            generated_by: input.generated_by,
            status: InvoiceStatus.LATEST,
            file_name: `${invoicePrefix}${displayNumber}.pdf`,
            pdf_content: pdfContent,
        }])

        if (!createdInvoice || createdInvoice.length === 0) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "Failed to create invoice record"
            )
        }

        const invoice = createdInvoice[0]

        // Update next invoice number in config
        if (config.id) {
            await invoiceService.updateInvoiceConfigs([{
                id: config.id,
                next_invoice_number: nextInvoiceNumber + 1,
            }])
        }

        return new StepResponse(
            invoice,
            {
                invoiceId: invoice.id,
                configId: config.id,
                originalNextNumber: nextInvoiceNumber,
            }
        )
    },
    async (compensationData, { container }) => {
        // Compensation logic: delete the created invoice if the workflow fails
        if (compensationData?.invoiceId) {
            const invoiceService: InvoiceModuleService =
                container.resolve(INVOICE_GENERATOR_MODULE)
            await invoiceService.deleteInvoices([compensationData.invoiceId])

            // Revert the invoice number if we have config
            if (compensationData.configId && compensationData.originalNextNumber) {
                await invoiceService.updateInvoiceConfigs([{
                    id: compensationData.configId,
                    next_invoice_number: compensationData.originalNextNumber,
                }])
            }
        }
    }
)