import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function testPaymentStructure({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const paymentModuleService = container.resolve(Modules.PAYMENT);

    logger.info("Testing payment structure for invoice generation...");

    try {
        // List payments that are authorized but not captured
        const payments = await paymentModuleService.listPayments({
            captured_at: null, // Not captured yet
            status: "authorized" // Authorized payments that can be captured
        });

        logger.info(`Found ${payments.length} authorized payments that can be captured`);

        if (payments.length === 0) {
            logger.info("No authorized payments found. Checking all payments...");
            const allPayments = await paymentModuleService.listPayments({});

            logger.info(`Found ${allPayments.length} total payments`);
            allPayments.forEach((payment: any, index: number) => {
                logger.info(`Payment ${index + 1}:`);
                logger.info(`  ID: ${payment.id}`);
                logger.info(`  Amount: ${payment.amount}`);
                logger.info(`  Currency: ${payment.currency_code}`);
                logger.info(`  Status: ${payment.status}`);
                logger.info(`  Captured: ${payment.captured_at ? 'Yes' : 'No'}`);
                logger.info(`  Payment Collection ID: ${payment.payment_collection_id}`);
                logger.info(`  Raw payment keys: ${Object.keys(payment).join(', ')}`);

                // Check for order_id in payment data
                if (payment.data && typeof payment.data === 'object') {
                    logger.info(`  Payment data keys: ${Object.keys(payment.data).join(', ')}`);
                    if (payment.data.order_id) {
                        logger.info(`  Found order_id in payment.data: ${payment.data.order_id}`);
                    }
                }
            });
        } else {
            payments.forEach((payment: any, index: number) => {
                logger.info(`Authorized Payment ${index + 1}:`);
                logger.info(`  ID: ${payment.id}`);
                logger.info(`  Amount: ${payment.amount}`);
                logger.info(`  Currency: ${payment.currency_code}`);
                logger.info(`  Status: ${payment.status}`);
                logger.info(`  Payment Collection ID: ${payment.payment_collection_id}`);
                logger.info(`  Raw payment keys: ${Object.keys(payment).join(', ')}`);
            });

            // Try to capture the first payment to test the subscriber
            if (payments.length > 0) {
                const paymentToCapture = payments[0];
                logger.info(`Attempting to capture payment ${paymentToCapture.id}...`);

                try {
                    // Capture the payment
                    const capturedPayment = await paymentModuleService.capturePayment({
                        payment_id: paymentToCapture.id,
                        amount: paymentToCapture.amount
                    });

                    logger.info(`Successfully captured payment ${capturedPayment.id}`);
                    logger.info(`Captured at: ${capturedPayment.captured_at}`);

                    // Check if invoice was generated
                    setTimeout(async () => {
                        logger.info("Checking for generated invoice...");
                        try {
                            const invoiceModuleService = container.resolve("invoiceModuleService");
                            if (invoiceModuleService && typeof invoiceModuleService.listInvoices === 'function') {
                                const invoices = await invoiceModuleService.listInvoices({
                                    payment_id: capturedPayment.id
                                });
                                logger.info(`Found ${invoices.length} invoices for payment ${capturedPayment.id}`);
                            } else {
                                logger.info("Invoice module service not available");
                            }
                        } catch (invoiceError) {
                            logger.error("Error checking invoices:", invoiceError);
                        }
                    }, 2000);

                } catch (captureError) {
                    logger.error(`Failed to capture payment:`, captureError);
                }
            }
        }

    } catch (error) {
        logger.error("Error testing payment structure:", error);
    }

    logger.info("Test completed");
}