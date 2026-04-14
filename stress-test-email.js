const axios = require('axios');

/**
 * STRESS TEST: Concurrent Email Requests
 * This script sends 5 simultaneous POST requests to the invoice email endpoint.
 * With the new "Atomic Lock" logic, only ONE should succeed (or be processed first),
 * and the others should return "Email already sent".
 */
async function runStressTest(invoiceId) {
    const url = `http://localhost:9000/admin/invoices/${invoiceId}/send-email`;
    console.log(`🚀 Starting Concurrency Stress Test for invoice: ${invoiceId}`);
    
    // Preparation: We assume the invoice starts with email_sent: false
    // Note: You must ensure this invoice ID exists and has email_sent: false 
    // before running this for the first time.

    const requests = [
        axios.post(url, {}, { validateStatus: false }),
        axios.post(url, {}, { validateStatus: false }),
        axios.post(url, {}, { validateStatus: false }),
        axios.post(url, {}, { validateStatus: false }),
        axios.post(url, {}, { validateStatus: false })
    ];

    console.log('📡 Blasting 5 concurrent requests...');
    const startTime = Date.now();
    
    try {
        const results = await Promise.all(requests);
        const duration = Date.now() - startTime;
        
        console.log(`\n⏱️ All requests finished in ${duration}ms`);
        console.log('-------------------------------------------');
        
        let successCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        results.forEach((res, index) => {
            const data = res.data;
            console.log(`Request #${index + 1}: Status ${res.status} - ${data.message || 'No message'}`);
            
            if (data.success && data.message !== "Email already sent") {
                successCount++;
            } else if (data.message === "Email already sent" || (data.success && data.message === "Email already sent")) {
                skippedCount++;
            } else {
                errorCount++;
            }
        });

        console.log('-------------------------------------------');
        console.log(`📊 Summary:`);
        console.log(`   - Sent/Locked: ${successCount}`);
        console.log(`   - Correctly Blocked: ${skippedCount}`);
        console.log(`   - Errors: ${errorCount}`);

        if (successCount === 1) {
            console.log('\n✅ TEST PASSED: Only 1 email process was initiated!');
        } else if (successCount > 1) {
            console.log(`\n❌ TEST FAILED: ${successCount} emails were attempted! Race condition still exists.`);
        } else {
            console.log('\n❓ TEST INCONCLUSIVE: No email was sent (maybe it was already sent?)');
        }

    } catch (err) {
        console.error('💥 Test execution failed:', err.message);
    }
}

// Usage instructions: 
// 1. Find a fresh invoice ID that hasn't been sent.
// 2. Run: node stress-test-email.js <invoice_id>
const targetId = process.argv[2];
if (!targetId) {
    console.log('Please provide an invoice ID: node stress-test-email.js <id>');
} else {
    runStressTest(targetId);
}
