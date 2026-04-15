const fetch = require('node-fetch');

async function testOrderMetadata() {
    const publishableKey = "pk_e7d2bd7fca834fa2541bea309907a00e0e580efe573c882f58c7af6df0830a97";

    // First, let's download an invoice and capture the logs
    const invoiceId = '01KNRR096A7NPTT22YZH9CNTJY';
    const url = `http://localhost:9000/store/invoices/${invoiceId}/download`;

    console.log("Testing order metadata for invoice:", invoiceId);

    try {
        const response = await fetch(url, {
            headers: {
                'x-publishable-api-key': publishableKey
            }
        });

        if (!response.ok) {
            console.error(`Failed: ${response.status} ${response.statusText}`);
            return;
        }

        // The download will trigger logs on the server
        console.log("Download triggered, check server logs for order metadata");

        // Let's also try to query the order directly using the internal API
        // We need to see what fields are actually available
        console.log("\n=== Checking server logs for order structure ===");
        console.log("The server logs should show:");
        console.log("1. Order object keys");
        console.log("2. Whether metadata field exists");
        console.log("3. What's in the metadata");

    } catch (error) {
        console.error("Error:", error.message);
    }
}

testOrderMetadata();