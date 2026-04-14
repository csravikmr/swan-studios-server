const fetch = require('node-fetch');

async function testDownload() {
    const invoiceId = '01KNRR096A7NPTT22YZH9CNTJY'; // From the error message
    const url = `http://localhost:9000/store/invoices/${invoiceId}/download`;
    const publishableKey = 'pk_e7d2bd7fca834fa2541bea309907a00e0e580efe573c882f58c7af6df0830a97';

    console.log(`Testing download for invoice ${invoiceId}...`);
    console.log(`URL: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'x-publishable-api-key': publishableKey
            }
        });
        console.log(`Response status: ${response.status}`);
        console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const text = await response.text();
            console.log(`Error response body:`, text);
        } else {
            console.log(`Download successful!`);
            const buffer = await response.buffer();
            console.log(`PDF size: ${buffer.length} bytes`);
        }
    } catch (error) {
        console.error(`Request failed:`, error.message);
    }
}

testDownload();