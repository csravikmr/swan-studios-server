const { createContainer } = require("@medusajs/framework/utils")

async function testOrderStructure() {
    console.log("Testing order structure...")

    try {
        const container = await createContainer({})
        const query = container.resolve("query")

        // Get an order ID from an existing invoice
        const { data: invoices } = await query.graph({
            entity: "invoice",
            fields: ["id", "order_id"],
            filters: {},
            options: { limit: 1 }
        })

        if (!invoices || invoices.length === 0) {
            console.log("No invoices found")
            return
        }

        const invoice = invoices[0]
        const orderId = invoice.order_id

        console.log(`Found invoice ${invoice.id} with order ID: ${orderId}`)

        // Get the order with ALL fields using different approaches
        console.log("\n=== Approach 1: Using '*' ===")
        const { data: orders1 } = await query.graph({
            entity: "order",
            fields: ["*"],
            filters: { id: orderId },
        })

        if (orders1 && orders1.length > 0) {
            const order1 = orders1[0]
            console.log(`Order keys (using '*'): ${Object.keys(order1).length} keys`)
            console.log("First 30 keys:", Object.keys(order1).slice(0, 30))

            // Check for total fields
            const totalFields = ['subtotal', 'tax_total', 'shipping_total', 'discount_total', 'total']
            totalFields.forEach(field => {
                console.log(`  ${field}: ${field in order1 ? 'EXISTS' : 'MISSING'} (value: ${order1[field]})`)
            })
        }

        console.log("\n=== Approach 2: Using explicit field names ===")
        const { data: orders2 } = await query.graph({
            entity: "order",
            fields: [
                "id",
                "display_id",
                "currency_code",
                "subtotal",
                "tax_total",
                "shipping_total",
                "discount_total",
                "total",
                "items.*"
            ],
            filters: { id: orderId },
        })

        if (orders2 && orders2.length > 0) {
            const order2 = orders2[0]
            console.log(`Order keys (explicit): ${Object.keys(order2).length} keys`)
            console.log("All keys:", Object.keys(order2))

            // Check for total fields
            const totalFields = ['subtotal', 'tax_total', 'shipping_total', 'discount_total', 'total']
            totalFields.forEach(field => {
                console.log(`  ${field}: ${field in order2 ? 'EXISTS' : 'MISSING'} (value: ${order2[field]})`)
            })

            // Log the full order structure for debugging
            console.log("\n=== Full order structure (excluding items) ===")
            Object.keys(order2).forEach(key => {
                if (key !== 'items') {
                    console.log(`  ${key}: ${JSON.stringify(order2[key])}`)
                }
            })

            // Check items
            if (order2.items && order2.items.length > 0) {
                console.log(`\n=== First item structure ===`)
                const firstItem = order2.items[0]
                console.log("Item keys:", Object.keys(firstItem))
                console.log("Item unit_price:", firstItem.unit_price)
                console.log("Item total:", firstItem.total)
            }
        }

        console.log("\n=== Approach 3: Try different field name variations ===")
        // Try common field name variations
        const fieldVariations = [
            'subtotal', 'subtotal_amount', 'sub_total',
            'tax_total', 'tax_amount', 'tax_total_amount',
            'shipping_total', 'shipping_amount', 'shipping_total_amount',
            'discount_total', 'discount_amount', 'discount_total_amount',
            'total', 'total_amount', 'grand_total'
        ]

        const { data: orders3 } = await query.graph({
            entity: "order",
            fields: fieldVariations,
            filters: { id: orderId },
        })

        if (orders3 && orders3.length > 0) {
            const order3 = orders3[0]
            console.log(`Found ${Object.keys(order3).length} fields with variations`)
            Object.keys(order3).forEach(key => {
                console.log(`  ${key}: ${order3[key]} `)
            })
        }

        console.log("\n=== Test complete ===")

    } catch (error) {
        console.error("Error:", error)
    }
}

testOrderStructure().then(() => {
    console.log("Done")
    process.exit(0)
}).catch(error => {
    console.error("Fatal error:", error)
    process.exit(1)
})