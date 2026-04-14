const { Medusa } = require("@medusajs/medusa");

async function listOrders() {
    try {
        // Initialize Medusa
        const medusa = new Medusa({
            baseUrl: "http://localhost:9000",
            maxRetries: 3
        });

        // List orders
        const { orders } = await medusa.admin.orders.list();

        console.log(`Found ${orders.length} orders:`);

        orders.forEach((order, index) => {
            console.log(`\nOrder ${index + 1}:`);
            console.log(`  ID: ${order.id}`);
            console.log(`  Status: ${order.status}`);
            console.log(`  Payment Status: ${order.payment_status}`);
            console.log(`  Fulfillment Status: ${order.fulfillment_status}`);

            // Check for payments
            if (order.payments && order.payments.length > 0) {
                console.log(`  Payments: ${order.payments.length}`);
                order.payments.forEach((payment, pIndex) => {
                    console.log(`    Payment ${pIndex + 1}:`);
                    console.log(`      ID: ${payment.id}`);
                    console.log(`      Amount: ${payment.amount}`);
                    console.log(`      Currency: ${payment.currency_code}`);
                    console.log(`      Status: ${payment.status}`);
                    console.log(`      Captured: ${payment.captured_at ? 'Yes' : 'No'}`);
                });
            } else {
                console.log(`  No payments found`);
            }
        });

    } catch (error) {
        console.error("Error listing orders:", error.message);
        console.error(error);
    }
}

listOrders();