const { createContainer } = require("@medusajs/framework/utils")

async function inspectOrder() {
    const orderId = "order_01KNRQZPYX27MEP08N3BC7XE2X";
    console.log(`Inspecting order ${orderId}...`);

    try {
        const container = await createContainer({})
        const query = container.resolve("query")

        const { data: orders } = await query.graph({
            entity: "order",
            fields: [
                "*",
                "summary.*",
                "items.*",
                "shipping_methods.*"
            ],
            filters: { id: orderId },
        })

        if (!orders || orders.length === 0) {
            console.log("Order not found");
            return;
        }

        const order = orders[0];
        
        console.log("\n=== ORDER SUMMARY FIELD ===");
        console.log(JSON.stringify(order.summary, null, 2));

        console.log("\n=== ROOT TOTAL FIELDS ===");
        const rootTotals = Object.keys(order).filter(k => k.includes('total') || k === 'subtotal');
        rootTotals.forEach(k => {
            console.log(`${k}: ${order[k]}`);
        });

        console.log("\n=== ITEMS (First Item) ===");
        if (order.items && order.items.length > 0) {
            console.log(JSON.stringify(order.items[0], null, 2));
        }

        console.log("\n=== SHIPPING METHODS ===");
        console.log(JSON.stringify(order.shipping_methods, null, 2));

    } catch (error) {
        console.error("Error inspecting order:", error);
    }
}

inspectOrder().then(() => process.exit(0));
