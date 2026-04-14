const fetch = require('node-fetch');

async function testDownloadWithLogs() {
    console.log("Testing download to see logs...")

    // First, get an invoice ID
    const invoiceId = "01KNRTHWMSPT4CWFN21MVVQ73P" // From previous logs

    const url = `http://localhost:9000/store/invoices/${invoiceId}/download`

    console.log(`Testing download for invoice: ${invoiceId}`)

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-publishable-api-key': 'pk_e7d2bd7fca834fa2541bea309907a00e0e580efe573c882f58c7af6df0830a97'
            }
        })

        console.log(`Response status: ${response.status}`)

        if (response.status === 200) {
            const buffer = await response.buffer()
            console.log(`PDF size: ${buffer.length} bytes`)
            console.log("PDF downloaded successfully")

            // Check first few bytes to verify it's a PDF
            const firstBytes = buffer.slice(0, 5).toString()
            console.log(`First 5 bytes: ${firstBytes} (should be %PDF-)`)
        } else {
            const text = await response.text()
            console.log(`Error response: ${text}`)
        }
    } catch (error) {
        console.error("Error:", error.message)
    }
}

testDownloadWithLogs().catch(console.error)