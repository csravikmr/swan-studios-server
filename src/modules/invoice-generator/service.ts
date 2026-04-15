import { MedusaService } from "@medusajs/framework/utils"
import { BigNumberValue } from "@medusajs/framework/types"
import pdfMake from "pdfmake/build/pdfmake"
import pdfFonts from "pdfmake/build/vfs_fonts"
import Invoice from "./models/invoice"
import InvoiceConfig from "./models/invoice-config"

// Register fonts for pdfmake
try {
    // pdfFonts is the vfs object itself (contains Roboto-*.ttf files)
    // pdfMake.fonts is already configured with Roboto font definitions
    // We just need to set the vfs
    (pdfMake as any).vfs = pdfFonts
    console.log("PDFMake vfs registered successfully")
} catch (error) {
    console.warn("Could not register pdfmake vfs, but invoice generation should still work:", error)
}

type GeneratePdfParams = {
    order: any
    items: Array<{
        title: string
        quantity: number
        unit_price: BigNumberValue
        total: BigNumberValue
    }>
}

class InvoiceModuleService extends MedusaService({
    Invoice,
    InvoiceConfig,
}) {
    private async formatAmount(amount: BigNumberValue, currency: string): Promise<string> {
        // Handle null, undefined, or empty values
        if (amount === null || amount === undefined) {
            amount = 0
        }
        // Convert BigNumberJS or other types to number
        let numAmount: number
        if (typeof amount === 'string') {
            numAmount = parseFloat(amount)
        } else if (typeof amount === 'number') {
            numAmount = amount
        } else if (amount && typeof amount === 'object' && 'toNumber' in amount) {
            // BigNumberJS-like object
            numAmount = (amount as any).toNumber()
        } else {
            numAmount = Number(amount)
        }
        // Ensure it's a valid number
        if (isNaN(numAmount) || !isFinite(numAmount)) {
            numAmount = 0
        }
        // Default currency to USD if not provided
        const currencyCode = currency || "USD"
        try {
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: currencyCode,
            }).format(numAmount)
        } catch (error) {
            // Fallback to USD if currency is invalid
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
            }).format(numAmount)
        }
    }

    private async imageUrlToBase64(url: string): Promise<string> {
        // Implementation for converting image URL to base64
        // This is a placeholder - you'd need to implement actual image fetching
        return ""
    }

    private async ensureDefaultConfig(): Promise<void> {
        // Ensure default invoice configuration exists
        const configs = await this.listInvoiceConfigs()
        if (configs.length === 0) {
            await this.createInvoiceConfigs({
                company_name: "Swan Studios",
                company_address: "123 Studio Street, Creative City",
                company_phone: "+1 (555) 123-4567",
                company_email: "info@swanstudios.com",
                company_logo: "",
                notes: "Thank you for your business!",
            })
        }
    }

    private async createInvoiceContent(
        params: GeneratePdfParams,
        invoice: any
    ): Promise<Record<string, any>> {
        const currency_code = params.order.currency_code || "USD"

        // Helper function to convert BigNumberValue to number
        const toNumber = (value: BigNumberValue): number => {
            if (value === null || value === undefined) {
                return 0
            }
            if (typeof value === 'string') {
                return parseFloat(value)
            } else if (typeof value === 'number') {
                return value
            } else if (value && typeof value === 'object' && 'toNumber' in value) {
                // BigNumberJS-like object
                return (value as any).toNumber()
            } else {
                return Number(value)
            }
        }

        // Use the verified Medusa v2 calculated total fields
        // These fields must be explicitly requested in the query
        const order = params.order
        const summary = order.summary || {}
        
        // Exact mapping to Admin "Order Summary" section
        // Note: item_subtotal is the sum of items before tax/discount
        //       shipping_subtotal is the shipping cost before tax
        const subtotal = order.item_subtotal ?? summary.subtotal ?? order.subtotal ?? 0
        const shipping_total = order.shipping_subtotal ?? summary.shipping_total ?? order.shipping_total ?? 0
        const tax_total = order.tax_total ?? summary.tax_total ?? 0
        const discount_total = order.discount_total ?? summary.discount_total ?? 0
        const total = order.total ?? summary.current_order_total ?? summary.total ?? 0

        // Use a simple helper to ensure we have numbers for display
        // Medusa v2 returns high-precision strings (e.g. "19800.0000...")
        const finalizeAmount = (value: any): number => {
            if (value === null || value === undefined) return 0
            return toNumber(value)
        }

        const finalSubtotal = finalizeAmount(subtotal)
        const finalTaxTotal = finalizeAmount(tax_total)
        const finalShippingTotal = finalizeAmount(shipping_total)
        const finalDiscountTotal = finalizeAmount(discount_total)
        const finalTotal = finalizeAmount(total)

        // Log the exact values mapping for verification
        console.log("[Invoice] Mapping verified totals:", {
            backend_item_subtotal: order.item_subtotal,
            backend_shipping_subtotal: order.shipping_subtotal,
            backend_tax_total: order.tax_total,
            backend_total: order.total,
            finalized: {
                subtotal: finalSubtotal,
                tax: finalTaxTotal,
                shipping: finalShippingTotal,
                discount: finalDiscountTotal,
                total: finalTotal
            }
        })

        // Log the values being used for debugging
        console.log("[Invoice] Using order summary values:", {
            subtotal,
            tax_total,
            shipping_total,
            discount_total,
            total,
            currency_code
        })

        // Log the full order object structure to see what fields are available
        console.log("[Invoice] Order object keys:", Object.keys(params.order))
        console.log("[Invoice] Order object has subtotal?", 'subtotal' in params.order)
        console.log("[Invoice] Order object has tax_total?", 'tax_total' in params.order)
        console.log("[Invoice] Order object has shipping_total?", 'shipping_total' in params.order)
        console.log("[Invoice] Order object has discount_total?", 'discount_total' in params.order)
        console.log("[Invoice] Order object has total?", 'total' in params.order)

        // Log some sample values from the order
        console.log("[Invoice] Order display_id:", params.order.display_id)
        console.log("[Invoice] Order currency_code:", params.order.currency_code)
        console.log("[Invoice] Order created_at:", params.order.created_at)

        // Check for metadata
        console.log("[Invoice] Order metadata:", params.order.metadata)

        // Check for alternative field names that might contain totals
        // In Medusa v2, totals might be in different fields
        const allOrderKeys = Object.keys(params.order)
        console.log("[Invoice] All order keys for inspection:", allOrderKeys)

        // Look for any keys that might contain totals
        const possibleTotalKeys = allOrderKeys.filter(key =>
            key.includes('total') ||
            key.includes('subtotal') ||
            key.includes('tax') ||
            key.includes('shipping') ||
            key.includes('discount') ||
            key.includes('amount')
        )
        console.log("[Invoice] Possible total-related keys:", possibleTotalKeys)

        // Log values of these keys
        for (const key of possibleTotalKeys) {
            console.log(`[Invoice] ${key}:`, params.order[key])
        }

        // Also check items for price information
        if (params.items && params.items.length > 0) {
            console.log("[Invoice] First item keys:", Object.keys(params.items[0]))
            console.log("[Invoice] First item:", {
                title: params.items[0].title,
                quantity: params.items[0].quantity,
                unit_price: params.items[0].unit_price,
                total: params.items[0].total
            })

            // Check the detail field (using type assertion since it's not in the type definition)
            const firstItem = params.items[0] as any
            console.log("[Invoice] First item detail field:", firstItem.detail)

            // Check if detail has total information
            if (firstItem.detail) {
                console.log("[Invoice] Detail keys:", Object.keys(firstItem.detail))
            }
        }

        // Ensure default configuration exists
        await this.ensureDefaultConfig()

        // Get invoice configuration
        const invoiceConfigs = await this.listInvoiceConfigs()
        const config = invoiceConfigs[0] || {}

        // Create table for order items
        const itemsTable = [
            [
                { text: "Item", style: "tableHeader" },
                { text: "Quantity", style: "tableHeader" },
                { text: "Unit Price", style: "tableHeader" },
                { text: "Total", style: "tableHeader" },
            ],
            ...(await Promise.all(params.items.map(async (item) => [
                { text: item.title || "Unknown Item", style: "tableRow" },
                { text: (typeof item.quantity === 'object' ? (item.quantity as any)?.toNumber?.()?.toString() || JSON.stringify(item.quantity) : item.quantity.toString()), style: "tableRow" },
                {
                    text: await this.formatAmount(
                        item.unit_price,
                        currency_code
                    ), style: "tableRow"
                },
                {
                    text: await this.formatAmount(
                        item.total,
                        currency_code
                    ), style: "tableRow"
                },
            ]))),
        ]

        const invoiceId = invoice?.display_id 
            ? `INV-${invoice.display_id.toString().padStart(6, "0")}`
            : `ORD-${params.order.display_id || params.order.id}`
        
        const invoiceDate = invoice?.created_at 
            ? new Date(invoice.created_at).toLocaleDateString()
            : new Date().toLocaleDateString()
            
        const orderDate = new Date(params.order.created_at).toLocaleDateString()

        // return the PDF content structure
        return {
            pageSize: "A4",
            pageMargins: [40, 60, 40, 60],
            header: {
                margin: [40, 20, 40, 0],
                columns: [
                    /** Company Logo */
                    {
                        width: "*",
                        stack: [
                            ...(config.company_logo ? [
                                {
                                    image: await this.imageUrlToBase64(config.company_logo),
                                    width: 80,
                                    height: 40,
                                    fit: [80, 40],
                                    margin: [0, 0, 0, 10],
                                },
                            ] : []),
                            {
                                text: config.company_name || "Your Company Name",
                                style: "companyName",
                                margin: [0, 0, 0, 0],
                            },
                        ],
                    },
                    /** Invoice Title */
                    {
                        width: "auto",
                        stack: [
                            { text: "INVOICE", style: "invoiceTitle" },
                            { text: invoiceId, style: "invoiceId" },
                        ],
                        alignment: "right",
                    },
                ],
            },
            content: [
                // Company details
                {
                    columns: [
                        {
                            width: "*",
                            stack: [
                                { text: config.company_name || "Your Company Name", style: "companyName" },
                                { text: config.company_address || "", style: "companyDetail" },
                                { text: `Phone: ${config.company_phone || ""}`, style: "companyDetail" },
                                { text: `Email: ${config.company_email || ""}`, style: "companyDetail" },
                            ],
                        },
                        {
                            width: "auto",
                            stack: [
                                { text: `Invoice Date: ${invoiceDate}`, style: "invoiceDetail" },
                                { text: `Order ID: ${params.order.display_id}`, style: "invoiceDetail" },
                                { text: `Order Date: ${orderDate}`, style: "invoiceDetail" },
                            ],
                            alignment: "right",
                        },
                    ],
                    margin: [0, 30, 0, 20],
                },
                // Billing and shipping addresses
                {
                    columns: [
                        {
                            width: "*",
                            stack: [
                                { text: "BILLING ADDRESS", style: "sectionHeader" },
                                { text: params.order.billing_address?.first_name || "" + " " + (params.order.billing_address?.last_name || ""), style: "addressLine" },
                                { text: params.order.billing_address?.address_1 || "", style: "addressLine" },
                                { text: params.order.billing_address?.city || "" + ", " + (params.order.billing_address?.province || "") + " " + (params.order.billing_address?.postal_code || ""), style: "addressLine" },
                                { text: params.order.billing_address?.country_code || "", style: "addressLine" },
                            ],
                        },
                        {
                            width: "*",
                            stack: [
                                { text: "SHIPPING ADDRESS", style: "sectionHeader" },
                                { text: params.order.shipping_address?.first_name || "" + " " + (params.order.shipping_address?.last_name || ""), style: "addressLine" },
                                { text: params.order.shipping_address?.address_1 || "", style: "addressLine" },
                                { text: params.order.shipping_address?.city || "" + ", " + (params.order.shipping_address?.province || "") + " " + (params.order.shipping_address?.postal_code || ""), style: "addressLine" },
                                { text: params.order.shipping_address?.country_code || "", style: "addressLine" },
                            ],
                        },
                    ],
                    margin: [0, 0, 0, 30],
                },
                // Items table
                {
                    table: {
                        headerRows: 1,
                        widths: ["*", "auto", "auto", "auto"],
                        body: itemsTable,
                    },
                    layout: {
                        fillColor: (rowIndex: number) => rowIndex === 0 ? "#cccccc" : null,
                    },
                },
                // Totals
                {
                    columns: [
                        { width: "*", text: "" },
                        {
                            width: "auto",
                            stack: [
                                { text: `Subtotal: ${await this.formatAmount(finalSubtotal, currency_code)}`, style: "totalLine" },
                                { text: `Tax: ${await this.formatAmount(finalTaxTotal, currency_code)}`, style: "totalLine" },
                                { text: `Shipping: ${await this.formatAmount(finalShippingTotal, currency_code)}`, style: "totalLine" },
                                { text: `Discount: ${await this.formatAmount(finalDiscountTotal, currency_code)}`, style: "totalLine" },
                                ...(params.order.gift_card_total ? [
                                    { text: `Gift Card: ${await this.formatAmount(params.order.gift_card_total, currency_code)}`, style: "totalLine" }
                                ] : []),
                                { text: `Total: ${await this.formatAmount(finalTotal, currency_code)}`, style: "totalLine", bold: true },
                            ],
                            alignment: "right",
                            margin: [0, 20, 0, 0],
                        },
                    ],
                },
                // Notes
                ...(config.notes ? [
                    { text: "Notes", style: "sectionHeader", margin: [0, 30, 0, 10] },
                    { text: config.notes, style: "notes" },
                ] : []),
            ],
            styles: {
                companyName: {
                    fontSize: 16,
                    bold: true,
                    margin: [0, 0, 0, 5],
                },
                companyDetail: {
                    fontSize: 10,
                    margin: [0, 0, 0, 2],
                },
                invoiceTitle: {
                    fontSize: 24,
                    bold: true,
                    alignment: "right",
                },
                invoiceId: {
                    fontSize: 14,
                    bold: true,
                    alignment: "right",
                    margin: [0, 5, 0, 0],
                },
                invoiceDetail: {
                    fontSize: 10,
                    margin: [0, 0, 0, 2],
                    alignment: "right",
                },
                sectionHeader: {
                    fontSize: 12,
                    bold: true,
                    margin: [0, 0, 0, 5],
                },
                addressLine: {
                    fontSize: 10,
                    margin: [0, 0, 0, 2],
                },
                tableHeader: {
                    bold: true,
                    fontSize: 10,
                    color: "black",
                    fillColor: "#eeeeee",
                },
                tableRow: {
                    fontSize: 10,
                },
                totalLine: {
                    fontSize: 10,
                    margin: [0, 0, 0, 2],
                },
                notes: {
                    fontSize: 10,
                    margin: [0, 0, 0, 5],
                },
            },
            defaultStyle: {
                font: "Roboto",
            },
        }
    }

    async generatePdf(params: GeneratePdfParams & {
        invoice_id: string
    }): Promise<Buffer> {
        const invoice = await this.retrieveInvoice(params.invoice_id)

        // Always regenerate content to ensure we have the latest order totals
        // This fixes the issue where cached PDF content has zero values
        const pdfContent = await this.createInvoiceContent(params, invoice)

        // Ensure font is properly set in the content
        // This fixes the "Font 'Helvetica' in style 'bold'" error
        if (!pdfContent.defaultStyle) {
            pdfContent.defaultStyle = {}
        }
        pdfContent.defaultStyle.font = "Roboto"

        // Also ensure fonts are properly defined in the document definition
        if (!pdfContent.fonts) {
            pdfContent.fonts = {
                Roboto: {
                    normal: 'Roboto-Regular.ttf',
                    bold: 'Roboto-Medium.ttf',
                    italics: 'Roboto-Italic.ttf',
                    bolditalics: 'Roboto-MediumItalic.ttf'
                }
            }
        }

        // Update the invoice with the new PDF content for future caching
        await this.updateInvoices({
            id: invoice.id,
            pdf_content: pdfContent,
        })

        // get PDF as a Buffer using standard pdfmake pattern
        try {
            console.log("Generating PDF with content keys:", Object.keys(pdfContent))
            console.log("PDF content defaultStyle:", pdfContent.defaultStyle)
            console.log("PDF content fonts:", pdfContent.fonts)

            // Use pdfmake's high-level API to create PDF and get buffer
            const pdfDoc = pdfMake.createPdf(pdfContent as any)
            const buffer = await pdfDoc.getBuffer()

            if (!buffer || buffer.length === 0) {
                console.error("PDF buffer is empty")
                throw new Error("Failed to generate PDF - empty buffer")
            }

            console.log(`PDF generated successfully, size: ${buffer.length} bytes`)
            return buffer
        } catch (error) {
            console.error("Error in PDF generation:", error)
            throw error
        }
    }
}

export default InvoiceModuleService