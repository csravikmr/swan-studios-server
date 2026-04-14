// Simple test script to test invoice download
const http = require('http');

async function testDownload() {
    console.log('Testing invoice download endpoint...');

    // First, let's get a list of invoices
    const options = {
        hostname: 'localhost',
        port: 9000,
        path: '/admin/invoices',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`GET /admin/invoices status: ${res.statusCode}`);

                if (res.statusCode === 200) {
                    try {
                        const invoices = JSON.parse(data);
                        console.log(`Found ${invoices.length} invoices`);

                        if (invoices.length > 0) {
                            const invoiceId = invoices[0].id;
                            console.log(`Testing download for invoice: ${invoiceId}`);
                            testSingleDownload(invoiceId).then(resolve).catch(reject);
                        } else {
                            console.log('No invoices found to test download');
                            resolve();
                        }
                    } catch (err) {
                        console.error('Error parsing response:', err);
                        reject(err);
                    }
                } else {
                    console.log('Response data:', data);
                    reject(new Error(`GET request failed with status ${res.statusCode}`));
                }
            });
        });

        req.on('error', (err) => {
            console.error('Request error:', err);
            reject(err);
        });

        req.end();
    });
}

function testSingleDownload(invoiceId) {
    return new Promise((resolve, reject) => {
        console.log(`Testing download for invoice ${invoiceId}...`);

        const options = {
            hostname: 'localhost',
            port: 9000,
            path: `/admin/invoices/${invoiceId}/download`,
            method: 'GET',
        };

        const req = http.request(options, (res) => {
            console.log(`GET /admin/invoices/${invoiceId}/download status: ${res.statusCode}`);
            console.log('Headers:', res.headers);

            let data = [];
            let totalBytes = 0;

            res.on('data', (chunk) => {
                data.push(chunk);
                totalBytes += chunk.length;
            });

            res.on('end', () => {
                console.log(`Download completed. Received ${totalBytes} bytes`);

                if (res.statusCode === 200) {
                    console.log('SUCCESS: PDF download endpoint is working correctly!');
                    const buffer = Buffer.concat(data);
                    console.log(`PDF size: ${buffer.length} bytes`);

                    // Check if it looks like a PDF
                    if (buffer.length > 0 && buffer.slice(0, 4).toString() === '%PDF') {
                        console.log('✓ Valid PDF file detected (starts with %PDF)');
                    } else if (buffer.length > 0) {
                        console.log('⚠ File downloaded but may not be a valid PDF');
                        console.log('First 100 bytes:', buffer.slice(0, 100).toString('hex'));
                    }
                } else {
                    console.log('Response body (first 500 chars):', Buffer.concat(data).toString().substring(0, 500));
                }

                resolve();
            });
        });

        req.on('error', (err) => {
            console.error('Download request error:', err);
            reject(err);
        });

        req.end();
    });
}

// Run the test
testDownload().then(() => {
    console.log('Test completed');
    process.exit(0);
}).catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
});