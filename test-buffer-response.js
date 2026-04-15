const http = require('http');

const server = http.createServer((req, res) => {
    console.log('Test server received request');

    // Create a simple PDF-like buffer
    const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\nxref\n0 2\n0000000000 65535 f\n0000000010 00000 n\ntrailer\n<<>>\nstartxref\n20\n%%EOF', 'utf8');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="test.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);

    console.log('Sending buffer with res.end(pdfBuffer)');
    res.end(pdfBuffer);
});

server.listen(3001, () => {
    console.log('Test server listening on port 3001');
    console.log('Run: curl -o test.pdf http://localhost:3001/');
});