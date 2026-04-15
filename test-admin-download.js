const fs = require('fs');
const path = require('path');

async function testAdminDownload() {
    try {
        // First, let's get an invoice ID from the database or from a test
        // We'll use the same invoice ID that was used in previous tests
        const invoiceId = '01KNRTHWMSPT4CWFN21MVVQ73P'; // From server logs

        console.log(`Testing admin download for invoice ID: ${invoiceId}`);

        // For admin endpoint, we need admin authentication
        // In a real scenario, we'd need an admin API key
        // Let's check if there's an admin API key in environment
        const adminApiKey = process.env.ADMIN_API_KEY || 'test_admin_key';

        const url = `http://localhost:9000/admin/invoices/${invoiceId}/download`;

        console.log(`Making request to: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminApiKey}`,
                'Content-Type': 'application/json',
            },
        });

        console.log(`Response status: ${response.status}`);
        console.log(`Response headers:`);
        for (const [key, value] of response.headers.entries()) {
            console.log(`  ${key}: ${value}`);
        }

        if (response.status === 200) {
            const buffer = await response.arrayBuffer();
            const pdfBuffer = Buffer.from(buffer);

            console.log(`PDF size: ${pdfBuffer.length} bytes`);

            // Save the file for inspection
            const outputPath = path.join(__dirname, 'test-admin-download.pdf');
            fs.writeFileSync(outputPath, pdfBuffer);
            console.log(`PDF saved to: ${outputPath}`);

            // Check if it's a valid PDF
            const firstBytes = pdfBuffer.slice(0, 5).toString();
            console.log(`First 5 bytes: ${firstBytes} (hex: ${pdfBuffer.slice(0, 5).toString('hex')})`);

            if (firstBytes === '%PDF-') {
                console.log('✓ PDF has valid header');
            } else {
                console.log('✗ PDF does not have valid header');
                console.log('Full first 100 bytes:', pdfBuffer.slice(0, 100).toString());
            }

            // Check for EOF marker
            const lastBytes = pdfBuffer.slice(-6).toString();
            if (lastBytes.includes('%%EOF')) {
                console.log('✓ PDF has EOF marker');
            } else {
                console.log('✗ PDF missing EOF marker');
            }

            return { success: true, path: outputPath, size: pdfBuffer.length };
        } else {
            const errorText = await response.text();
            console.error(`Error response: ${errorText}`);
            return { success: false, status: response.status, error: errorText };
        }
    } catch (error) {
        console.error('Error testing admin download:', error);
        return { success: false, error: error.message };
    }
}

// Check if fetch is available (Node 18+ has fetch globally)
if (typeof fetch === 'undefined') {
    const fetch = require('node-fetch');
    global.fetch = fetch;
}

testAdminDownload().then(result => {
    console.log('\nTest completed:', result);
    process.exit(result.success ? 0 : 1);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});