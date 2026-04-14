const { Medusa } = require("@medusajs/medusa");

async function checkOrderTotals() {
    try {
        const medusa = new Medusa({
            baseUrl: "http://localhost:9000",
            maxRetries: 0,
        });

        // Get the order ID from the invoice
        const orderId = "order_01KNRQZPYX27MEP08N3BC7XE2X";

        console.log(`Fetching order ${orderId}...`);
        const { order } = await medusa.admin.orders.retrieve(orderId);

        console.log("Order details:");
        console.log(`- Display ID: ${order.display_id}`);
        console.log(`- Subtotal: ${order.subtotal}`);
        console.log(`- Tax total: ${order.tax_total}`);
        console.log(`- Shipping total: ${order.shipping_total}`);
        console.log(`- Discount total: ${order.discount_total}`);
        console.log(`- Total: ${order.total}`);
        console.log(`- Currency code: ${order.currency_code}`);

        // Check items
        console.log("\nOrder items:");
        order.items.forEach((item, index) => {
            console.log(`Item ${index + 1}:`);
            console.log(`  Title: ${item.title}`);
            console.log(`  Quantity: ${item.quantity}`);
            console.log(`  Unit price: ${item.unit_price}`);
            console.log(`  Total: ${item.total}`);
        });

        // Also check the invoice
        console.log("\nFetching invoices for this order...");
        const { data: invoices } = await medusa.admin.invoices.list({
            order_id: orderId
        });

        if (invoices.length > 0) {
            console.log(`Found ${invoices.length} invoice(s):`);
            invoices.forEach((invoice, index) => {
                console.log(`Invoice ${index + 1}:`);
                console.log(`  ID: ${invoice.id}`);
                console.log(`  Display ID: ${invoice.display_id}`);
                console.log(`  Created at: ${invoice.created_at}`);
                console.log(`  PDF content keys: ${Object.keys(invoice.pdf_content || {}).join(', ')}`);
            });
        } else {
            console.log("No invoices found for this order");
        }

    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", error.response.data);
        }
    }
}

checkOrderTotals();