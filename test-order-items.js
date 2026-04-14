const fetch = require('node-fetch');

async function testOrderItems() {
    const publishableKey = "pk_e7d2bd7fca834fa2541bea309907a00e0e580efe573c882f58c7af6df0830a97";
    const orderId = "order_01KNRQZPYX27MEP08N3BC7XE2X"; // From the logs

    console.log("Testing order structure for order ID:", orderId);

    // Try different GraphQL queries to see what fields are available
    const queries = [
        {
            name: "Basic fields",
            query: `query {
                orders(id: "${orderId}") {
                    id
                    display_id
                    currency_code
                    items {
                        id
                        title
                        quantity
                        unit_price
                        subtotal
                        total
                    }
                }
            }`
        },
        {
            name: "With totals",
            query: `query {
                orders(id: "${orderId}") {
                    id
                    subtotal
                    tax_total
                    shipping_total
                    discount_total
                    total
                    items {
                        id
                        title
                        quantity
                        unit_price
                        subtotal
                        total
                    }
                }
            }`
        },
        {
            name: "All fields with wildcard",
            query: `query {
                orders(id: "${orderId}", fields: ["*", "items.*"]) {
                    id
                }
            }`
        }
    ];

    for (const queryInfo of queries) {
        console.log(`\n=== Testing query: ${queryInfo.name} ===`);
        console.log("Query:", queryInfo.query);

        try {
            const response = await fetch('http://localhost:9000/store/graphql', {
                method: 'POST',
                headers: {
                    'x-publishable-api-key': publishableKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: queryInfo.query })
            });

            if (!response.ok) {
                console.error(`Failed: ${response.status} ${response.statusText}`);
                continue;
            }

            const result = await response.json();
            console.log("Result:", JSON.stringify(result, null, 2));

            if (result.errors) {
                console.error("GraphQL errors:", result.errors);
            }

            if (result.data && result.data.orders && result.data.orders.length > 0) {
                const order = result.data.orders[0];
                console.log("Order keys:", Object.keys(order));
                if (order.items && order.items.length > 0) {
                    const item = order.items[0];
                    console.log("First item keys:", Object.keys(item));
                    console.log("First item:", {
                        title: item.title,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        subtotal: item.subtotal,
                        total: item.total
                    });
                }
            }
        } catch (error) {
            console.error("Error:", error.message);
        }
    }
}

testOrderItems();