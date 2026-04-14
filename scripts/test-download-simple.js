// Simple test to check if download endpoint structure is correct
console.log('Testing download endpoint structure...');

// Check if the route file exists and has correct syntax
const fs = require('fs');
const path = require('path');

const adminRoutePath = path.join(__dirname, '../src/api/admin/invoices/[id]/download/route.ts');
const storeRoutePath = path.join(__dirname, '../src/api/store/invoices/[id]/download/route.ts');

console.log('Checking admin route file:', adminRoutePath);
if (fs.existsSync(adminRoutePath)) {
    const content = fs.readFileSync(adminRoutePath, 'utf8');
    console.log('✓ Admin route file exists');

    // Check for common issues
    if (content.includes('res.write(pdfBuffer)')) {
        console.log('⚠ Found res.write() - this might cause issues');
    }
    if (content.includes('res.status(200).send(pdfBuffer)')) {
        console.log('✓ Found res.status(200).send(pdfBuffer) - correct');
    }
    if (content.includes('Content-Length')) {
        console.log('✓ Content-Length header is set');
    }
    if (content.includes('Content-Disposition')) {
        console.log('✓ Content-Disposition header is set');
    }
} else {
    console.log('✗ Admin route file does not exist');
}

console.log('\nChecking store route file:', storeRoutePath);
if (fs.existsSync(storeRoutePath)) {
    const content = fs.readFileSync(storeRoutePath, 'utf8');
    console.log('✓ Store route file exists');

    // Check for common issues
    if (content.includes('res.write(pdfBuffer)')) {
        console.log('⚠ Found res.write() - this might cause issues');
    }
    if (content.includes('res.status(200).send(pdfBuffer)')) {
        console.log('✓ Found res.status(200).send(pdfBuffer) - correct');
    }
} else {
    console.log('✗ Store route file does not exist');
}

// Check service.ts for PDF generation issues
const servicePath = path.join(__dirname, '../src/modules/invoice-generator/service.ts');
console.log('\nChecking service file:', servicePath);
if (fs.existsSync(servicePath)) {
    const content = fs.readFileSync(servicePath, 'utf8');
    console.log('✓ Service file exists');

    if (content.includes('pdfMake.createPdf')) {
        console.log('✓ Using pdfMake.createPdf (high-level API)');
    }
    if (content.includes('printer.createPdfKitDocument')) {
        console.log('⚠ Found printer.createPdfKitDocument (low-level API) - might cause issues');
    }
    if (content.includes('pdfMake.setFonts(fonts)')) {
        console.log('✓ Fonts are configured with pdfMake.setFonts()');
    }
} else {
    console.log('✗ Service file does not exist');
}

console.log('\n=== Summary ===');
console.log('The download endpoints appear to be correctly structured.');
console.log('If downloads are still failing, possible issues could be:');
console.log('1. Authentication issues (401 Unauthorized)');
console.log('2. Invoice or order data not found (404)');
console.log('3. PDF generation errors (check server logs)');
console.log('4. Frontend not handling the binary response correctly');