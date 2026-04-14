// Simple test to check invoice download
console.log("Testing invoice download functionality...")

// Since we can't easily import the modules, let's just check if the endpoints are working
// by making HTTP requests to the running server

const testEndpoints = async () => {
    try {
        // First, let's check if we can get invoices list
        console.log("1. Testing GET /admin/invoices endpoint...")
        const invoicesResponse = await fetch('http://localhost:9000/admin/invoices?filters={"order_id":"order_01KNGY9868B7EQ2NCBFK9HFPBW"}')

        if (invoicesResponse.ok) {
            const invoicesData = await invoicesResponse.json()
            console.log(`   Success! Found ${invoicesData.invoices?.length || 0} invoices`)

            if (invoicesData.invoices && invoicesData.invoices.length > 0) {
                const invoice = invoicesData.invoices[0]
                console.log(`   Testing download for invoice ${invoice.id}...`)

                // Test admin download endpoint
                console.log(`2. Testing GET /admin/invoices/${invoice.id}/download...`)
                const downloadResponse = await fetch(`http://localhost:9000/admin/invoices/${invoice.id}/download`)

                if (downloadResponse.ok) {
                    const contentType = downloadResponse.headers.get('content-type')
                    const contentLength = downloadResponse.headers.get('content-length')
                    console.log(`   Success! Content-Type: ${contentType}, Size: ${contentLength} bytes`)

                    // Check if it's a PDF
                    if (contentType === 'application/pdf') {
                        console.log("   ✓ PDF download endpoint is working correctly!")
                        return { success: true, message: "Invoice download is working" }
                    } else {
                        console.log(`   ✗ Expected PDF but got: ${contentType}`)
                        return { success: false, message: `Wrong content type: ${contentType}` }
                    }
                } else {
                    console.log(`   ✗ Download failed: ${downloadResponse.status} ${downloadResponse.statusText}`)
                    const errorText = await downloadResponse.text()
                    console.log(`   Error details: ${errorText}`)
                    return { success: false, message: `Download failed: ${downloadResponse.status}` }
                }
            } else {
                console.log("   No invoices found for testing")
                console.log("\nTo test invoice download:")
                console.log("1. Go to http://localhost:9000/app/orders")
                console.log("2. Open an order with payment captured")
                console.log("3. Click 'Generate Invoice' button in the Invoices widget")
                console.log("4. Then click 'Download' on the generated invoice")
                return { success: false, message: "No invoices found to test" }
            }
        } else {
            console.log(`   ✗ Failed to get invoices: ${invoicesResponse.status} ${invoicesResponse.statusText}`)
            return { success: false, message: "Cannot fetch invoices" }
        }
    } catch (error) {
        console.error("   ✗ Error:", error.message)
        return { success: false, message: error.message }
    }
}

// Run the test
testEndpoints()
    .then(result => {
        console.log("\nTest result:", result)
        process.exit(result.success ? 0 : 1)
    })
    .catch(error => {
        console.error("Unhandled error:", error)
        process.exit(1)
    })