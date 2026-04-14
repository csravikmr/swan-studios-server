const fs = require('fs');
const path = require('path');

async function testInvoiceDownload() {
    // Use the publishable API key from .env.local
    const publishableKey = "pk_e7d2bd7fca834fa2541bea309907a00e0e580efe573c882f58c7af6df0830a97";

    // First, let's get an invoice ID from the database or use a known one
    // We'll try to fetch invoices first
    const invoicesUrl = "http://localhost:9000/store/invoices";

    console.log("Fetching invoices...");
    try {
        const invoicesResponse = await fetch(invoicesUrl, {
            headers: {
                'x-publishable-api-key': publishableKey,
                'Content-Type': 'application/json'
            }
        });

        if (!invoicesResponse.ok) {
            console.error(`Failed to fetch invoices: ${invoicesResponse.status} ${invoicesResponse.statusText}`);
            const errorText = await invoicesResponse.text();
            console.error(`Error details: ${errorText}`);
            return;
        }

        const invoices = await invoicesResponse.json();
        console.log(`Found ${invoices.invoices?.length || 0} invoices`);

        if (invoices.invoices && invoices.invoices.length > 0) {
            const invoiceId = invoices.invoices[0].id;
            console.log(`Using invoice ID: ${invoiceId}`);

            // Now download the invoice
            const downloadUrl = `http://localhost:9000/store/invoices/${invoiceId}/download`;
            console.log(`Downloading invoice from: ${downloadUrl}`);

            const downloadResponse = await fetch(downloadUrl, {
                headers: {
                    'x-publishable-api-key': publishableKey
                }
            });

            if (!downloadResponse.ok) {
                console.error(`Failed to download invoice: ${downloadResponse.status} ${downloadResponse.statusText}`);
                const errorText = await downloadResponse.text();
                console.error(`Error details: ${errorText}`);
                return;
            }

            const pdfBuffer = await downloadResponse.arrayBuffer();
            console.log(`PDF downloaded successfully, size: ${pdfBuffer.byteLength} bytes`);

            // Save to file for inspection
            const outputPath = path.join(__dirname, 'test-invoice.pdf');
            fs.writeFileSync(outputPath, Buffer.from(pdfBuffer));
            console.log(`PDF saved to: ${outputPath}`);

            // Check first few bytes
            const buffer = Buffer.from(pdfBuffer);
            const firstBytes = buffer.slice(0, 10).toString('hex');
            console.log(`First 10 bytes (hex): ${firstBytes}`);
            console.log(`First 10 bytes (ascii): ${buffer.slice(0, 10).toString()}`);

            if (firstBytes.startsWith('25504446')) { // %PDF in hex
                console.log("✓ PDF has valid header");
            } else {
                console.log("✗ PDF may be corrupted or not a valid PDF");
            }
        } else {
            console.log("No invoices found. Creating a test order first...");
            // We need to create a test order first
            // For now, let's just exit
            console.log("Please create an order first to test invoice generation");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

// Use node-fetch if available
let fetch;
try {
    fetch = require('node-fetch');
} catch {
    fetch = globalThis.fetch;
}

if (!fetch) {
    console.error("Fetch is not available. Install node-fetch or use Node.js 18+");
    process.exit(1);
}

testInvoiceDownload();