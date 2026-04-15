import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INVOICE_GENERATOR_MODULE } from "../../../../../modules/invoice-generator"
import InvoiceModuleService from "../../../../../modules/invoice-generator/service"

export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
): Promise<void> {
    try {
        console.log(`Download invoice request for ID: ${req.params.id}`)
        const { id } = req.params
        const invoiceService: InvoiceModuleService =
            req.scope.resolve(INVOICE_GENERATOR_MODULE)

        // Get the invoice to verify it exists and get order_id
        const query = req.scope.resolve("query")
        const { data: invoices } = await query.graph({
            entity: "invoice",
            fields: ["id", "order_id", "display_id", "file_name", "pdf_content"],
            filters: {
                id,
            },
        })

        console.log(`Found ${invoices?.length || 0} invoices with ID ${id}`)

        if (!invoices || invoices.length === 0) {
            console.log(`Invoice ${id} not found`)
            res.status(404).json({ message: "Invoice not found" })
            return
        }

        const invoice = invoices[0]
        const orderId = invoice.order_id

        console.log(`Invoice ${id} has order ID: ${orderId}`)

        if (!orderId) {
            console.log(`Invoice ${id} has no associated order`)
            res.status(400).json({ message: "Invoice has no associated order" })
            return
        }

        // Fetch 1: Basic info and relations (items, summary)
        const { data: ordersBasic } = await query.graph({
            entity: "order",
            fields: [
                "id",
                "display_id",
                "currency_code",
                "items.*",
                "summary.*",
                "shipping_methods.*",
                "shipping_address.*",
                "billing_address.*",
            ],
            filters: {
                id: orderId,
            },
        })

        // Fetch 2: Root calculated total fields
        const { data: ordersTotals } = await query.graph({
            entity: "order",
            fields: [
                "id",
                "item_subtotal",
                "item_total",
                "item_tax_total",
                "shipping_subtotal",
                "shipping_total",
                "shipping_tax_total",
                "tax_total",
                "discount_total",
                "discount_tax_total",
                "total",
                "paid_total",
                "refundable_total"
            ],
            filters: {
                id: orderId,
            },
        })

        if (!ordersBasic || ordersBasic.length === 0 || !ordersTotals || ordersTotals.length === 0) {
            console.log(`Order ${orderId} information not found for invoice ${id}`)
            res.status(404).json({ message: "Order data not found" })
            return
        }

        // Merge the results
        const order = {
            ...ordersBasic[0],
            ...ordersTotals[0]
        }
        const items = order.items || []

        console.log(`Order ${orderId} has ${items.length} items`)

        // Generate PDF using the service
        console.log(`Generating PDF for invoice ${id}...`)
        const pdfBuffer = await invoiceService.generatePdf({
            invoice_id: id,
            order: order as any,
            items: items as any,
        })

        console.log(`PDF generated successfully, size: ${pdfBuffer.length} bytes`)

        // Get file name from invoice or generate one
        const fileName = invoice.file_name || `invoice-${invoice.display_id || id}.pdf`
        console.log(`Download filename: ${fileName}`)

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
        res.setHeader('Content-Length', pdfBuffer.length)

        console.log(`Sending PDF response with Content-Length: ${pdfBuffer.length}`)

        // Send the PDF - use res.end() to send raw buffer without JSON serialization
        res.status(200)
        res.end(pdfBuffer)
        console.log(`PDF sent successfully for invoice ${id}`)
    } catch (error) {
        console.error("Error downloading invoice:", error)
        res.status(500).json({ message: "Failed to download invoice" })
    }
}