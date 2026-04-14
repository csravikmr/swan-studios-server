import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function testPayments({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    logger.info("Testing payment capture and invoice generation...");

    // First, let's find orders with payments that can be captured
    try {
        // List orders
        const ordersResult = await query.graph({
            entity: "order",
            fields: [
                "id",
                "status",
                "payment_status",
                "fulfillment_status",
                "payments.id",
                "payments.amount",
                "payments.currency_code",
                "payments.status",
                "payments.captured_at",
                "payments.payment_collection_id",
                "payments.payment_collection.order_id",
            ],
            filters: {},
            pagination: { take: 10 }
        });

        const orders = ordersResult.data || [];
        logger.info(`Found ${orders.length} orders with pending payments`);

        if (orders.length === 0) {
            logger.info("No orders with pending payments found. Creating a test order...");
            // We might need to create a test order with a payment
            return;
        }

        // Log each order
        orders.forEach((order: any, index: number) => {
            logger.info(`Order ${index + 1}: ${order.id}`);
            logger.info(`  Status: ${order.status}, Payment Status: ${order.payment_status}`);

            if (order.payments && order.payments.length > 0) {
                order.payments.forEach((payment: any, pIndex: number) => {
                    logger.info(`  Payment ${pIndex + 1}: ${payment.id}`);
                    logger.info(`    Amount: ${payment.amount} ${payment.currency_code}`);
                    logger.info(`    Status: ${payment.status}`);
                    logger.info(`    Captured: ${payment.captured_at ? 'Yes' : 'No'}`);
                    if (payment.payment_collection?.order_id) {
                        logger.info(`    Order ID from payment collection: ${payment.payment_collection.order_id}`);
                    }
                });
            }
        });

        // Check if we have any invoices already
        const invoicesResult = await query.graph({
            entity: "invoice",
            fields: ["id", "order_id", "payment_id", "trigger", "generated_by", "created_at"],
            pagination: { take: 10 }
        });

        const invoices = invoicesResult.data || [];
        logger.info(`Found ${invoices.length} existing invoices`);
        invoices.forEach((invoice: any) => {
            logger.info(`  Invoice: ${invoice.id} for order ${invoice.order_id}, trigger: ${invoice.trigger}, generated_by: ${invoice.generated_by}`);
        });

    } catch (error) {
        logger.error("Error querying orders:", error);
    }

    logger.info("Test completed");
}