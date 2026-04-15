const fs = require('fs');

const filename = 'test-invoice-01KNRR096A7NPTT22YZH9CNTJY.pdf';

console.log(`Examining file: ${filename}`);
console.log(`File size: ${fs.statSync(filename).size} bytes`);

const buffer = fs.readFileSync(filename);
console.log('\nFirst 200 bytes as hex:');
console.log(buffer.slice(0, 200).toString('hex'));

console.log('\nFirst 200 bytes as text:');
console.log(buffer.slice(0, 200).toString('utf8'));

console.log('\nFirst 500 bytes as text:');
console.log(buffer.slice(0, 500).toString('utf8'));

// Check if it's JSON
const text = buffer.toString('utf8', 0, 1000);
try {
    const json = JSON.parse(text);
    console.log('\n✓ File contains valid JSON:');
    console.log(JSON.stringify(json, null, 2).substring(0, 1000));
} catch (e) {
    console.log('\n✗ File is not valid JSON');
}

// Check for PDF signature
if (text.startsWith('%PDF')) {
    console.log('\n✓ File is a valid PDF (starts with %PDF)');
} else {
    console.log('\n✗ File is not a PDF (does not start with %PDF)');
}