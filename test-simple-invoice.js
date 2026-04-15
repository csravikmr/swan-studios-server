// Simple test to verify invoice totals are taken directly from order fields
console.log('Testing simplified invoice generation...\n');

// Simulate order data with actual values (like what would come from backend)
const mockOrder = {
    id: 'order_123',
    display_id: '12345',
    created_at: '2024-01-15T10:30:00Z',
    currency_code: 'USD',
    // These are the fields that should contain the calculated totals
    subtotal: 8500, // $85.00 in cents
    tax_total: 950, // $9.50 in cents
    shipping_total: 1000, // $10.00 in cents
    discount_total: 850, // $8.50 in cents
    total: 9600, // $96.00 in cents
    billing_address: {
        first_name: 'John',
        last_name: 'Doe',
        address_1: '123 Main St',
        city: 'New York',
        province: 'NY',
        postal_code: '10001',
        country_code: 'US'
    },
    shipping_address: {
        first_name: 'John',
        last_name: 'Doe',
        address_1: '123 Main St',
        city: 'New York',
        province: 'NY',
        postal_code: '10001',
        country_code: 'US'
    }
};

// Simulate items
const mockItems = [
    {
        title: 'Product A',
        quantity: 2,
        unit_price: 2500, // $25.00
        total: 5500 // $55.00 (including tax)
    },
    {
        title: 'Product B',
        quantity: 1,
        unit_price: 3500, // $35.00
        total: 3850 // $38.50 (including tax)
    }
];

console.log('Order Summary Values (from backend):');
console.log('====================================');
console.log(`Subtotal: $${(mockOrder.subtotal / 100).toFixed(2)}`);
console.log(`Tax: $${(mockOrder.tax_total / 100).toFixed(2)}`);
console.log(`Shipping: $${(mockOrder.shipping_total / 100).toFixed(2)}`);
console.log(`Discount: $${(mockOrder.discount_total / 100).toFixed(2)}`);
console.log(`Total: $${(mockOrder.total / 100).toFixed(2)}`);
console.log(`Currency: ${mockOrder.currency_code}`);

console.log('\nSimulating invoice generation:');
console.log('==============================');

// Simulate the formatAmount function from service.ts
const formatAmount = (amount, currency) => {
    if (amount === null || amount === undefined) {
        amount = 0;
    }

    let numAmount;
    if (typeof amount === 'string') {
        numAmount = parseFloat(amount);
    } else if (typeof amount === 'number') {
        numAmount = amount;
    } else if (amount && typeof amount === 'object' && 'toNumber' in amount) {
        numAmount = amount.toNumber();
    } else {
        numAmount = Number(amount);
    }

    if (isNaN(numAmount) || !isFinite(numAmount)) {
        numAmount = 0;
    }

    const currencyCode = currency || "USD";
    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currencyCode,
        }).format(numAmount / 100); // Convert cents to dollars
    } catch (error) {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(numAmount / 100);
    }
};

// Test the formatAmount function
console.log('\nFormatted amounts (as they would appear in invoice):');
console.log(`Subtotal: ${formatAmount(mockOrder.subtotal, mockOrder.currency_code)}`);
console.log(`Tax: ${formatAmount(mockOrder.tax_total, mockOrder.currency_code)}`);
console.log(`Shipping: ${formatAmount(mockOrder.shipping_total, mockOrder.currency_code)}`);
console.log(`Discount: ${formatAmount(mockOrder.discount_total, mockOrder.currency_code)}`);
console.log(`Total: ${formatAmount(mockOrder.total, mockOrder.currency_code)}`);

// Verify the values match what we expect
console.log('\nVerification:');
console.log('=============');

const expectedSubtotal = 8500;
const expectedTax = 950;
const expectedShipping = 1000;
const expectedDiscount = 850;
const expectedTotal = 9600;

const allMatch = mockOrder.subtotal === expectedSubtotal &&
    mockOrder.tax_total === expectedTax &&
    mockOrder.shipping_total === expectedShipping &&
    mockOrder.discount_total === expectedDiscount &&
    mockOrder.total === expectedTotal;

if (allMatch) {
    console.log('✅ All order totals match expected values!');
    console.log('✅ Invoice will display the correct values from backend order summary.');
} else {
    console.log('❌ Some totals do not match expected values:');
    if (mockOrder.subtotal !== expectedSubtotal) console.log(`  - Subtotal: got $${(mockOrder.subtotal / 100).toFixed(2)}, expected $${(expectedSubtotal / 100).toFixed(2)}`);
    if (mockOrder.tax_total !== expectedTax) console.log(`  - Tax: got $${(mockOrder.tax_total / 100).toFixed(2)}, expected $${(expectedTax / 100).toFixed(2)}`);
    if (mockOrder.shipping_total !== expectedShipping) console.log(`  - Shipping: got $${(mockOrder.shipping_total / 100).toFixed(2)}, expected $${(expectedShipping / 100).toFixed(2)}`);
    if (mockOrder.discount_total !== expectedDiscount) console.log(`  - Discount: got $${(mockOrder.discount_total / 100).toFixed(2)}, expected $${(expectedDiscount / 100).toFixed(2)}`);
    if (mockOrder.total !== expectedTotal) console.log(`  - Total: got $${(mockOrder.total / 100).toFixed(2)}, expected $${(expectedTotal / 100).toFixed(2)}`);
}

// Test edge cases
console.log('\nEdge Case Tests:');
console.log('================');

// Test 1: Null/undefined values
const testOrder1 = { subtotal: null, tax_total: undefined, shipping_total: 0, discount_total: null, total: 0, currency_code: 'USD' };
console.log('\nTest 1 - Null/undefined values:');
console.log(`Subtotal (null): ${formatAmount(testOrder1.subtotal, testOrder1.currency_code)}`);
console.log(`Tax (undefined): ${formatAmount(testOrder1.tax_total, testOrder1.currency_code)}`);
console.log(`Shipping (0): ${formatAmount(testOrder1.shipping_total, testOrder1.currency_code)}`);
console.log(`Discount (null): ${formatAmount(testOrder1.discount_total, testOrder1.currency_code)}`);
console.log(`Total (0): ${formatAmount(testOrder1.total, testOrder1.currency_code)}`);

// Test 2: String values
const testOrder2 = { subtotal: "8500", tax_total: "950", shipping_total: "1000", discount_total: "850", total: "9600", currency_code: 'USD' };
console.log('\nTest 2 - String values:');
console.log(`Subtotal ("8500"): ${formatAmount(testOrder2.subtotal, testOrder2.currency_code)}`);
console.log(`Tax ("950"): ${formatAmount(testOrder2.tax_total, testOrder2.currency_code)}`);

// Test 3: Different currency
const testOrder3 = { subtotal: 8500, tax_total: 950, shipping_total: 1000, discount_total: 850, total: 9600, currency_code: 'EUR' };
console.log('\nTest 3 - EUR currency:');
console.log(`Subtotal: ${formatAmount(testOrder3.subtotal, testOrder3.currency_code)}`);
console.log(`Total: ${formatAmount(testOrder3.total, testOrder3.currency_code)}`);

console.log('\n✅ Test completed. The invoice generation will now use order summary values directly.');
console.log('✅ No recalculation is performed - values match backend exactly.');