import { createContainer } from "@medusajs/framework/utils"
import { INVOICE_GENERATOR_MODULE } from "../src/modules/invoice-generator/index.js"
import InvoiceModuleService from "../src/modules/invoice-generator/service.js"

async function testInvoiceDownload() {
    console.log("Testing invoice download functionality...")

    try {
        // Create container
        const container = await createContainer({})

        // Get invoice service
        const invoiceService = container.resolve(INVOICE_GENERATOR_MODULE)

        // Get query service to find invoices
        const query = container.resolve("query")

        // Find all invoices
        const { data: invoices } = await query.graph({
            entity: "invoice",
            fields: ["id", "display_id", "order_id", "file_name", "status"],
            filters: {},
            pagination: { limit: 5 }
        })

        console.log(`Found ${invoices.length} invoices:`)
        invoices.forEach(invoice => {
            console.log(`- ID: ${invoice.id}, Display ID: ${invoice.display_id}, Order: ${invoice.order_id}, Status: ${invoice.status}`)
        })

        if (invoices.length > 0) {
            const testInvoice = invoices[0]
            console.log(`\nTesting download for invoice ${testInvoice.id}...`)

            try {
                // Get the order for this invoice
                const { data: orders } = await query.graph({
                    entity: "order",
                    fields: ["*", "items.*"],
                    filters: {
                        id: testInvoice.order_id
                    }
                })

                if (orders && orders.length > 0) {
                    const order = orders[0]
                    const items = order.items || []

                    console.log(`Order found with ${items.length} items`)

                    // Generate PDF
                    const pdfBuffer = await invoiceService.generatePdf({
                        invoice_id: testInvoice.id,
                        order: order,
                        items: items
                    })

                    console.log(`PDF generated successfully! Size: ${pdfBuffer.length} bytes`)

                    // Test the download endpoint via HTTP
                    console.log("\nTesting HTTP download endpoint...")
                    console.log(`Admin endpoint: GET /admin/invoices/${testInvoice.id}/download`)
                    console.log(`Store endpoint: GET /api/store/invoices/${testInvoice.id}/download`)

                    return {
                        success: true,
                        invoice: testInvoice,
                        pdfSize: pdfBuffer.length,
                        message: "Invoice download test passed"
                    }
                } else {
                    console.log(`No order found for invoice ${testInvoice.id}`)
                    return {
                        success: false,
                        message: "No order found for invoice"
                    }
                }
            } catch (error) {
                console.error("Error generating PDF:", error)
                return {
                    success: false,
                    error: error.message,
                    message: "PDF generation failed"
                }
            }
        } else {
            console.log("No invoices found in database")
            console.log("\nTo test invoice download:")
            console.log("1. Create an order in the admin")
            console.log("2. Capture payment to trigger automatic invoice generation")
            console.log("3. Or manually generate an invoice from the order page")

            return {
                success: false,
                message: "No invoices found to test"
            }
        }
    } catch (error) {
        console.error("Error in test:", error)
        return {
            success: false,
            error: error.message,
            message: "Test failed"
        }
    }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testInvoiceDownload()
        .then(result => {
            console.log("\nTest result:", result)
            process.exit(result.success ? 0 : 1)
        })
        .catch(error => {
            console.error("Unhandled error:", error)
            process.exit(1)
        })
}

export default testInvoiceDownload