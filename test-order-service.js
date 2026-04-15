const { createContainer } = require("@medusajs/framework/utils")

async function testOrderService() {
    console.log("Testing order service...")

    try {
        const container = await createContainer({})

        // Try to resolve the order service
        try {
            const orderService = container.resolve("orderService")
            console.log("Found orderService:", orderService?.constructor?.name)

            // Try to list orders
            const orders = await orderService.list({}, {
                relations: ["items"]
            })
            console.log(`Found ${orders?.length || 0} orders`)

            if (orders && orders.length > 0) {
                const order = orders[0]
                console.log("First order keys:", Object.keys(order))
                console.log("First order ID:", order.id)
                console.log("First order display_id:", order.display_id)

                // Check for total fields
                const totalFields = ['subtotal', 'tax_total', 'shipping_total', 'discount_total', 'total']
                totalFields.forEach(field => {
                    console.log(`  ${field}: ${field in order ? 'EXISTS' : 'MISSING'} (value: ${order[field]})`)
                })

                // Check items
                if (order.items && order.items.length > 0) {
                    console.log(`First item:`, {
                        title: order.items[0].title,
                        quantity: order.items[0].quantity,
                        unit_price: order.items[0].unit_price,
                        total: order.items[0].total
                    })
                }
            }
        } catch (error) {
            console.log("Error with orderService:", error.message)
        }

        // Try to resolve the order module service
        try {
            const orderModuleService = container.resolve("orderModuleService")
            console.log("Found orderModuleService:", orderModuleService?.constructor?.name)
        } catch (error) {
            console.log("Error with orderModuleService:", error.message)
        }

        // Try to resolve the order module
        try {
            const orderModule = container.resolve("orderModule")
            console.log("Found orderModule:", orderModule?.constructor?.name)
        } catch (error) {
            console.log("Error with orderModule:", error.message)
        }

        // List all services in container
        console.log("\nAvailable services in container:")
        const services = container.registrations || {}
        Object.keys(services).forEach(key => {
            if (key.includes('order') || key.includes('Order')) {
                console.log(`  - ${key}`)
            }
        })

    } catch (error) {
        console.error("Error in test:", error)
    }
}

testOrderService().catch(console.error)