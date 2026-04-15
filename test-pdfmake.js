const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');

console.log('pdfMake type:', typeof pdfMake);
console.log('pdfMake keys:', Object.keys(pdfMake));
console.log('pdfMake.fonts:', pdfMake.fonts);
console.log('pdfFonts type:', typeof pdfFonts);
console.log('pdfFonts keys:', Object.keys(pdfFonts));

// Set vfs directly
pdfMake.vfs = pdfFonts;
console.log('Set pdfMake.vfs = pdfFonts');
console.log('pdfMake.vfs set?', !!pdfMake.vfs);
console.log('pdfMake.vfs has Roboto-Regular.ttf?', !!pdfMake.vfs['Roboto-Regular.ttf']);

// Check if fonts are already configured
console.log('pdfMake.fonts after setting vfs:', pdfMake.fonts);

// Try to create a simple PDF to test
const docDefinition = {
    content: 'Hello World!'
};

try {
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    console.log('PDF creation succeeded');
} catch (error) {
    console.log('PDF creation error:', error.message);
}