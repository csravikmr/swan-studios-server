// Test script to verify invoice totals computation
const path = require('path');

// Mock the Medusa container and services
async function testInvoiceTotals() {
    console.log('Testing invoice totals computation...\n');

    // Create a mock order with items that have subtotals
    const mockOrder = {
        id: 'order_123',
        display_id: '12345',
        created_at: '2024-01-15T10:30:00Z',
        currency_code: 'USD',
        // These fields might be null/undefined in real data
        subtotal: null,
        tax_total: null,
        shipping_total: null,
        discount_total: null,
        total: null,
        // Alternative field names that might exist
        item_subtotal: 8500, // $85.00 in cents
        original_subtotal: 8500,
        shipping_subtotal: 1000, // $10.00 in cents
        item_tax_total: 850, // $8.50 in cents
        shipping_tax_total: 100, // $1.00 in cents
        original_total: 10450, // $104.50 in cents
        items: [
            {
                id: 'item_1',
                title: 'Product A',
                quantity: 2,
                unit_price: 2500, // $25.00 in cents
                subtotal: 5000, // $50.00 in cents
                tax_total: 500, // $5.00 in cents
                total: 5500 // $55.00 in cents
            },
            {
                id: 'item_2',
                title: 'Product B',
                quantity: 1,
                unit_price: 3500, // $35.00 in cents
                subtotal: 3500, // $35.00 in cents
                tax_total: 350, // $3.50 in cents
                total: 3850 // $38.50 in cents
            }
        ],
        shipping_methods: [
            {
                id: 'ship_1',
                name: 'Standard Shipping',
                price: 1000, // $10.00 in cents
                tax_total: 100 // $1.00 in cents
            }
        ],
        discounts: [
            {
                id: 'disc_1',
                code: 'SAVE10',
                rule: {
                    type: 'percentage',
                    value: 10
                },
                total: 850 // $8.50 in cents (10% of $85)
            }
        ],
        customer: {
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com'
        },
        shipping_address: {
            first_name: 'John',
            last_name: 'Doe',
            address_1: '123 Main St',
            city: 'New York',
            country_code: 'US',
            postal_code: '10001'
        },
        billing_address: {
            first_name: 'John',
            last_name: 'Doe',
            address_1: '123 Main St',
            city: 'New York',
            country_code: 'US',
            postal_code: '10001'
        }
    };

    // Expected totals based on items:
    // Subtotal: $50.00 + $35.00 = $85.00
    // Tax: $5.00 + $3.50 + $1.00 = $9.50
    // Shipping: $10.00
    // Discount: $8.50
    // Total: $85.00 + $9.50 + $10.00 - $8.50 = $96.00

    console.log('Mock Order Data:');
    console.log('===============');
    console.log(`Order ID: ${mockOrder.id}`);
    console.log(`Display ID: ${mockOrder.display_id}`);
    console.log(`Currency: ${mockOrder.currency_code}`);
    console.log(`\nOrder Fields (may be null):`);
    console.log(`- subtotal: ${mockOrder.subtotal}`);
    console.log(`- tax_total: ${mockOrder.tax_total}`);
    console.log(`- shipping_total: ${mockOrder.shipping_total}`);
    console.log(`- discount_total: ${mockOrder.discount_total}`);
    console.log(`- total: ${mockOrder.total}`);
    console.log(`\nAlternative Fields:`);
    console.log(`- item_subtotal: ${mockOrder.item_subtotal} ($${(mockOrder.item_subtotal / 100).toFixed(2)})`);
    console.log(`- shipping_subtotal: ${mockOrder.shipping_subtotal} ($${(mockOrder.shipping_subtotal / 100).toFixed(2)})`);
    console.log(`- item_tax_total: ${mockOrder.item_tax_total} ($${(mockOrder.item_tax_total / 100).toFixed(2)})`);
    console.log(`- shipping_tax_total: ${mockOrder.shipping_tax_total} ($${(mockOrder.shipping_tax_total / 100).toFixed(2)})`);
    console.log(`- original_total: ${mockOrder.original_total} ($${(mockOrder.original_total / 100).toFixed(2)})`);

    console.log('\nItems:');
    mockOrder.items.forEach((item, i) => {
        console.log(`  Item ${i + 1}: ${item.title}`);
        console.log(`    Quantity: ${item.quantity}, Unit Price: $${(item.unit_price / 100).toFixed(2)}`);
        console.log(`    Subtotal: $${(item.subtotal / 100).toFixed(2)}, Tax: $${(item.tax_total / 100).toFixed(2)}, Total: $${(item.total / 100).toFixed(2)}`);
    });

    console.log('\nShipping Methods:');
    mockOrder.shipping_methods.forEach((method, i) => {
        console.log(`  Method ${i + 1}: ${method.name}`);
        console.log(`    Price: $${(method.price / 100).toFixed(2)}, Tax: $${(method.tax_total / 100).toFixed(2)}`);
    });

    console.log('\nDiscounts:');
    mockOrder.discounts.forEach((discount, i) => {
        console.log(`  Discount ${i + 1}: ${discount.code}`);
        console.log(`    Total: $${(discount.total / 100).toFixed(2)}`);
    });

    // Simulate the computation logic from service.ts
    console.log('\n\nSimulating Invoice Service Computation:');
    console.log('======================================');

    const getNumericValue = (value) => {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return parseFloat(value) || 0;
        if (typeof value === 'object' && 'toNumber' in value) return value.toNumber();
        return Number(value) || 0;
    };

    // Initialize with order fields
    let subtotal = getNumericValue(mockOrder.subtotal);
    let tax_total = getNumericValue(mockOrder.tax_total);
    let shipping_total = getNumericValue(mockOrder.shipping_total);
    let discount_total = getNumericValue(mockOrder.discount_total);
    let total = getNumericValue(mockOrder.total);

    console.log(`Initial values from order fields:`);
    console.log(`  subtotal: ${subtotal} ($${(subtotal / 100).toFixed(2)})`);
    console.log(`  tax_total: ${tax_total} ($${(tax_total / 100).toFixed(2)})`);
    console.log(`  shipping_total: ${shipping_total} ($${(shipping_total / 100).toFixed(2)})`);
    console.log(`  discount_total: ${discount_total} ($${(discount_total / 100).toFixed(2)})`);
    console.log(`  total: ${total} ($${(total / 100).toFixed(2)})`);

    // Check for alternative field names
    if (!subtotal || subtotal === 0) {
        subtotal = getNumericValue(mockOrder.item_subtotal) ||
            getNumericValue(mockOrder.original_subtotal) ||
            subtotal;
        console.log(`  Using alternative subtotal field: ${subtotal} ($${(subtotal / 100).toFixed(2)})`);
    }

    // If still zero, compute from items
    if (!subtotal || subtotal === 0) {
        subtotal = mockOrder.items.reduce((sum, item) => {
            return sum + getNumericValue(item.subtotal);
        }, 0);
        console.log(`  Computed subtotal from items: ${subtotal} ($${(subtotal / 100).toFixed(2)})`);
    }

    // Compute tax from items and shipping
    if (!tax_total || tax_total === 0) {
        // Try alternative tax fields
        tax_total = getNumericValue(mockOrder.item_tax_total) ||
            getNumericValue(mockOrder.shipping_tax_total) ||
            tax_total;

        if (!tax_total || tax_total === 0) {
            // Compute from items
            tax_total = mockOrder.items.reduce((sum, item) => {
                return sum + getNumericValue(item.tax_total);
            }, 0);

            // Add shipping tax if available
            if (mockOrder.shipping_methods && mockOrder.shipping_methods.length > 0) {
                tax_total += mockOrder.shipping_methods.reduce((sum, method) => {
                    return sum + getNumericValue(method.tax_total);
                }, 0);
            }
            console.log(`  Computed tax_total from items & shipping: ${tax_total} ($${(tax_total / 100).toFixed(2)})`);
        } else {
            console.log(`  Using alternative tax field: ${tax_total} ($${(tax_total / 100).toFixed(2)})`);
        }
    }

    // Compute shipping from shipping methods
    if (!shipping_total || shipping_total === 0) {
        shipping_total = getNumericValue(mockOrder.shipping_subtotal) || shipping_total;

        if (!shipping_total || shipping_total === 0) {
            if (mockOrder.shipping_methods && mockOrder.shipping_methods.length > 0) {
                shipping_total = mockOrder.shipping_methods.reduce((sum, method) => {
                    return sum + getNumericValue(method.price);
                }, 0);
            }
            console.log(`  Computed shipping_total from methods: ${shipping_total} ($${(shipping_total / 100).toFixed(2)})`);
        } else {
            console.log(`  Using alternative shipping field: ${shipping_total} ($${(shipping_total / 100).toFixed(2)})`);
        }
    }

    // Compute discount from discounts
    if (!discount_total || discount_total === 0) {
        if (mockOrder.discounts && mockOrder.discounts.length > 0) {
            discount_total = mockOrder.discounts.reduce((sum, discount) => {
                return sum + getNumericValue(discount.total);
            }, 0);
            console.log(`  Computed discount_total from discounts: ${discount_total} ($${(discount_total / 100).toFixed(2)})`);
        }
    }

    // Compute total if missing
    if (!total || total === 0) {
        total = getNumericValue(mockOrder.original_total) || total;

        if (!total || total === 0) {
            // Calculate: subtotal + tax_total + shipping_total - discount_total
            total = subtotal + tax_total + shipping_total - discount_total;
            console.log(`  Computed total: ${total} ($${(total / 100).toFixed(2)})`);
        } else {
            console.log(`  Using alternative total field: ${total} ($${(total / 100).toFixed(2)})`);
        }
    }

    console.log('\nFinal Computed Totals:');
    console.log('=====================');
    console.log(`Subtotal: $${(subtotal / 100).toFixed(2)}`);
    console.log(`Tax: $${(tax_total / 100).toFixed(2)}`);
    console.log(`Shipping: $${(shipping_total / 100).toFixed(2)}`);
    console.log(`Discount: $${(discount_total / 100).toFixed(2)}`);
    console.log(`Total: $${(total / 100).toFixed(2)}`);

    // Expected values
    const expectedSubtotal = 8500; // $85.00
    const expectedTax = 950; // $9.50 (item tax $8.50 + shipping tax $1.00)
    const expectedShipping = 1000; // $10.00
    const expectedDiscount = 850; // $8.50
    const expectedTotal = 9600; // $96.00

    console.log('\nExpected Totals (from manual calculation):');
    console.log('==========================================');
    console.log(`Subtotal: $${(expectedSubtotal / 100).toFixed(2)}`);
    console.log(`Tax: $${(expectedTax / 100).toFixed(2)}`);
    console.log(`Shipping: $${(expectedShipping / 100).toFixed(2)}`);
    console.log(`Discount: $${(expectedDiscount / 100).toFixed(2)}`);
    console.log(`Total: $${(expectedTotal / 100).toFixed(2)}`);

    console.log('\nVerification:');
    console.log('=============');

    const allMatch = subtotal === expectedSubtotal &&
        tax_total === expectedTax &&
        shipping_total === expectedShipping &&
        discount_total === expectedDiscount &&
        total === expectedTotal;

    if (allMatch) {
        console.log('✅ All totals match expected values!');
    } else {
        console.log('❌ Some totals do not match expected values:');
        if (subtotal !== expectedSubtotal) console.log(`  - Subtotal: got $${(subtotal / 100).toFixed(2)}, expected $${(expectedSubtotal / 100).toFixed(2)}`);
        if (tax_total !== expectedTax) console.log(`  - Tax: got $${(tax_total / 100).toFixed(2)}, expected $${(expectedTax / 100).toFixed(2)}`);
        if (shipping_total !== expectedShipping) console.log(`  - Shipping: got $${(shipping_total / 100).toFixed(2)}, expected $${(expectedShipping / 100).toFixed(2)}`);
        if (discount_total !== expectedDiscount) console.log(`  - Discount: got $${(discount_total / 100).toFixed(2)}, expected $${(expectedDiscount / 100).toFixed(2)}`);
        if (total !== expectedTotal) console.log(`  - Total: got $${(total / 100).toFixed(2)}, expected $${(expectedTotal / 100).toFixed(2)}`);
    }

    return allMatch;
}

// Run the test
testInvoiceTotals().then(success => {
    if (success) {
        console.log('\n✅ Test passed! The invoice totals computation logic works correctly.');
        process.exit(0);
    } else {
        console.log('\n❌ Test failed. The computation logic needs adjustment.');
        process.exit(1);
    }
}).catch(error => {
    console.error('Error running test:', error);
    process.exit(1);
});