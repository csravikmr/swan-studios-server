const fs = require('fs');
const fetch = require('node-fetch');

async function testPdfValidity() {
    const invoiceId = '01KNRR096A7NPTT22YZH9CNTJY';
    const url = `http://localhost:9000/store/invoices/${invoiceId}/download`;
    const publishableKey = 'pk_e7d2bd7fca834fa2541bea309907a00e0e580efe573c882f58c7af6df0830a97';

    console.log(`Testing PDF validity for invoice ${invoiceId}...`);

    try {
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

        const buffer = await response.buffer();
        console.log(`PDF size: ${buffer.length} bytes`);

        // Save to file for inspection
        const filename = `test-invoice-${invoiceId}.pdf`;
        fs.writeFileSync(filename, buffer);
        console.log(`PDF saved to ${filename}`);

        // Check first few bytes to verify it's a PDF
        const header = buffer.slice(0, 5).toString();
        console.log(`PDF header (first 5 bytes): ${header}`);

        // Check if it starts with PDF signature
        if (header.startsWith('%PDF')) {
            console.log('✓ PDF has valid header (starts with %PDF)');
        } else {
            console.log('✗ PDF has invalid header (does not start with %PDF)');
            console.log('Full header (first 100 bytes):', buffer.slice(0, 100).toString('hex'));
        }

        // Check for EOF marker
        const footer = buffer.slice(-6).toString();
        if (footer.includes('%%EOF')) {
            console.log('✓ PDF has EOF marker');
        } else {
            console.log('✗ PDF missing EOF marker');
        }

        // Try to parse with a simple PDF parser (basic check)
        try {
            // Simple check for PDF structure
            const pdfText = buffer.toString('utf8', 0, 1000);
            if (pdfText.includes('obj') && pdfText.includes('endobj')) {
                console.log('✓ PDF contains basic PDF objects');
            } else {
                console.log('✗ PDF missing basic PDF objects');
            }

            // Check for potential error messages in the PDF
            if (pdfText.includes('Error') || pdfText.includes('error') || pdfText.includes('Exception')) {
                console.log('⚠ PDF may contain error messages');
                console.log('Sample text:', pdfText.substring(0, 500));
            }
        } catch (e) {
            console.log('Could not parse PDF text:', e.message);
        }

    } catch (error) {
        console.error(`Request failed:`, error.message);
    }
}

testPdfValidity();