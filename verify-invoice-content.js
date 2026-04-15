const fs = require('fs');
const fetch = require('node-fetch');

async function verifyInvoiceContent() {
    const invoiceId = '01KNRR096A7NPTT22YZH9CNTJY';
    const url = `http://localhost:9000/store/invoices/${invoiceId}/download`;
    const publishableKey = 'pk_e7d2bd7fca834fa2541bea309907a00e0e580efe573c882f58c7af6df0830a97';

    console.log(`Verifying invoice content for ${invoiceId}...`);

    try {
        // Download the PDF
        const response = await fetch(url, {
            headers: {
                'x-publishable-api-key': publishableKey
            }
        });

        if (!response.ok) {
            console.error(`Response status: ${response.status}`);
            const text = await response.text();
            console.error(`Error response:`, text);
            return;
        }

        const pdfBuffer = await response.buffer();
        console.log(`PDF downloaded successfully, size: ${pdfBuffer.length} bytes`);

        // Save PDF for manual inspection
        const filename = `verified-invoice-${invoiceId}.pdf`;
        fs.writeFileSync(filename, pdfBuffer);
        console.log(`PDF saved to ${filename}`);

        // Also fetch order data to compare
        console.log('\n=== Fetching order data for comparison ===');

        // We need to get the order ID first
        const orderQueryUrl = `http://localhost:9000/store/orders?display_id=1036`;
        const orderResponse = await fetch(orderQueryUrl, {
            headers: {
                'x-publishable-api-key': publishableKey
            }
        });

        if (orderResponse.ok) {
            const orderData = await orderResponse.json();
            console.log('Order data:', JSON.stringify(orderData, null, 2));

            if (orderData.orders && orderData.orders.length > 0) {
                const order = orderData.orders[0];
                console.log('\n=== Order Summary Values ===');
                console.log(`Subtotal: ${order.subtotal}`);
                console.log(`Tax total: ${order.tax_total}`);
                console.log(`Shipping total: ${order.shipping_total}`);
                console.log(`Discount total: ${order.discount_total}`);
                console.log(`Total: ${order.total}`);
                console.log(`Currency code: ${order.currency_code}`);

                // Calculate final total for verification
                const calculatedTotal = (order.subtotal || 0) +
                    (order.tax_total || 0) +
                    (order.shipping_total || 0) -
                    (order.discount_total || 0);
                console.log(`Calculated total (subtotal + tax + shipping - discount): ${calculatedTotal}`);
            }
        } else {
            console.log('Could not fetch order data via store API');
        }

        console.log('\n=== Manual Verification Instructions ===');
        console.log('1. Open the PDF file to check if totals match');
        console.log('2. Compare with backend order summary values');
        console.log('3. Ensure no NaN or 0.00 values appear');
        console.log('\nThe PDF should show:');
        console.log('- Subtotal: Should match order.subtotal');
        console.log('- Tax: Should match order.tax_total');
        console.log('- Shipping: Should match order.shipping_total');
        console.log('- Discount: Should match order.discount_total');
        console.log('- Total: Should match order.total');

    } catch (error) {
        console.error(`Error:`, error.message);
    }
}

verifyInvoiceContent();