export default async function testPaymentCapture({ container }) {
    const query = container.resolve("query")
    const eventBusService = container.resolve("eventBusService")

    console.log("Testing automatic invoice generation on payment capture...")

    // First, get an order that has a payment
    const { data: orders } = await query.graph({
        entity: "order",
        fields: ["id", "payments.id", "payments.captured_at"],
        filters: {
            "payments.captured_at": null, // Get orders with uncaptured payments
        },
        pagination: { limit: 1 }
    })

    if (!orders || orders.length === 0) {
        console.log("No orders with uncaptured payments found")

        // Try to get any order
        const { data: allOrders } = await query.graph({
            entity: "order",
            fields: ["id"],
            filters: {},
            pagination: { limit: 1 }
        })

        if (!allOrders || allOrders.length === 0) {
            console.log("No orders found at all")
            return
        }

        const order = allOrders[0]
        console.log(`Using order ${order.id} for testing`)

        // Create a mock payment
        const paymentService = container.resolve("paymentService")
        const paymentData = {
            order_id: order.id,
            amount: 1000,
            currency_code: "usd",
            provider_id: "test_provider",
            data: {}
        }

        console.log("Creating test payment...")
        const payment = await paymentService.create(paymentData)
        console.log(`Created payment ${payment.id}`)

        // Emit payment.captured event
        console.log("Emitting payment.captured event...")
        await eventBusService.emit("payment.captured", {
            id: payment.id,
            order_id: order.id,
            amount: 1000,
            currency_code: "usd"
        })

        console.log("Event emitted. Waiting 2 seconds for subscriber to process...")
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Check if invoice was created
        const { data: invoices } = await query.graph({
            entity: "invoice",
            fields: ["id", "order_id", "display_id", "status", "trigger"],
            filters: {
                order_id: order.id,
            },
        })

        console.log(`Found ${invoices.length} invoices for order ${order.id}`)
        invoices.forEach(invoice => {
            console.log(`- Invoice ${invoice.id} (${invoice.display_id}): status=${invoice.status}, trigger=${invoice.trigger}`)
        })

        return
    }

    const order = orders[0]
    const payments = order.payments || []

    if (payments.length === 0) {
        console.log("Order has no payments")
        return
    }

    const payment = payments[0]
    console.log(`Found order ${order.id} with payment ${payment.id}`)

    // Emit payment.captured event
    console.log("Emitting payment.captured event...")
    await eventBusService.emit("payment.captured", {
        id: payment.id,
        order_id: order.id,
        amount: 1000,
        currency_code: "usd"
    })

    console.log("Event emitted. Waiting 2 seconds for subscriber to process...")
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Check if invoice was created
    const { data: invoices } = await query.graph({
        entity: "invoice",
        fields: ["id", "order_id", "display_id", "status", "trigger"],
        filters: {
            order_id: order.id,
        },
    })

    console.log(`Found ${invoices.length} invoices for order ${order.id}`)
    invoices.forEach(invoice => {
        console.log(`- Invoice ${invoice.id} (${invoice.display_id}): status=${invoice.status}, trigger=${invoice.trigger}`)
    })
}