import {
    SubscriberConfig,
    SubscriberArgs,
} from "@medusajs/framework"
import { createInvoiceWorkflow } from "../workflows/create-invoice"
import { INVOICE_GENERATOR_MODULE } from "../modules/invoice-generator"
import InvoiceModuleService from "../modules/invoice-generator/service"

export default async function paymentCapturedInvoiceHandler({
    event: { data },
    container,
}: SubscriberArgs<any>) {
    const logger = container.resolve("logger")

    // Debug log to see actual event structure
    logger.info(`[Invoice Subscriber] Payment captured event received. Full data: ${JSON.stringify(data)}`)

    // Try to extract payment object from different possible structures
    // Case 1: data is the payment object directly
    // Case 2: data has a payment property
    // Case 3: data has a data property containing payment
    // Case 4: data is just the payment ID string
    let payment: any = data
    let paymentId: string | null = null

    if (data && typeof data === 'object') {
        logger.info(`[Invoice Subscriber] Data type: object, keys: ${Object.keys(data)}`)
        if (data.payment) {
            payment = data.payment
            logger.info(`[Invoice Subscriber] Found payment in data.payment`)
        } else if (data.data && data.data.payment) {
            payment = data.data.payment
            logger.info(`[Invoice Subscriber] Found payment in data.data.payment`)
        } else if (data.id) {
            // Data might be just { id: "pay_..." }
            logger.info(`[Invoice Subscriber] Data appears to be minimal payment object with only ID`)
        } else {
            logger.info(`[Invoice Subscriber] Assuming data is the payment object itself`)
        }
    } else if (typeof data === 'string') {
        // Data might be just the payment ID string
        paymentId = data
        logger.info(`[Invoice Subscriber] Data is string payment ID: ${paymentId}`)
    }

    // Check if payment exists
    if (!payment || typeof payment !== 'object') {
        logger.warn(`[Invoice Subscriber] Payment data is undefined or invalid in payment.captured event. Event data: ${JSON.stringify(data)}`)
        return
    }

    logger.info(`[Invoice Subscriber] Payment object: ${JSON.stringify(payment)}`)
    logger.info(`[Invoice Subscriber] Payment ID: ${payment.id}, Payment keys: ${payment ? Object.keys(payment) : 'N/A'}`)

    try {
        // Get the order associated with the payment
        const query = container.resolve("query")

        // If payment doesn't have payment_collection_id, fetch the full payment object
        if (!payment.payment_collection_id && payment.id) {
            logger.info(`[Invoice Subscriber] Payment missing payment_collection_id, fetching full payment object for ID: ${payment.id}`)

            try {
                const { data: payments } = await query.graph({
                    entity: "payment",
                    fields: ["*"],
                    filters: {
                        id: payment.id,
                    },
                }) as any

                if (payments && payments.length > 0) {
                    payment = payments[0]
                    logger.info(`[Invoice Subscriber] Retrieved full payment object with keys: ${Object.keys(payment).join(', ')}`)
                    logger.info(`[Invoice Subscriber] Payment collection ID: ${payment.payment_collection_id}`)
                } else {
                    logger.warn(`[Invoice Subscriber] Payment ${payment.id} not found in database`)
                    return
                }
            } catch (fetchError) {
                logger.error(`[Invoice Subscriber] Error fetching payment ${payment.id}:`, fetchError)
                return
            }
        }

        // In Medusa v2, payments are associated with payment collections
        // We need to get the payment collection to find the order
        let orderId = payment.order_id

        // If order_id is not directly on payment, try to get it from payment collection
        if (!orderId && payment.payment_collection_id) {
            logger.info(`[Invoice Subscriber] Querying payment collection ${payment.payment_collection_id} for order ID`)

            try {
                // Query payment collection - explicitly request resource_id and resource_type
                const { data: paymentCollections } = await query.graph({
                    entity: "payment_collection",
                    fields: ["id", "resource_id", "resource_type", "metadata", "order_id"],
                    filters: {
                        id: payment.payment_collection_id,
                    },
                }) as any

                if (paymentCollections && paymentCollections.length > 0) {
                    const paymentCollection = paymentCollections[0]
                    logger.info(`[Invoice Subscriber] Payment collection data: ${JSON.stringify(paymentCollection)}`)

                    // Try different possible fields for order ID
                    if (paymentCollection.order_id) {
                        orderId = paymentCollection.order_id
                        logger.info(`[Invoice Subscriber] Found order ID from paymentCollection.order_id: ${orderId}`)
                    } else if (paymentCollection.resource_id && paymentCollection.resource_type === "order") {
                        orderId = paymentCollection.resource_id
                        logger.info(`[Invoice Subscriber] Found order ID from paymentCollection.resource_id: ${orderId}`)
                    } else if (paymentCollection.metadata && paymentCollection.metadata.order_id) {
                        orderId = paymentCollection.metadata.order_id
                        logger.info(`[Invoice Subscriber] Found order ID from paymentCollection.metadata.order_id: ${orderId}`)
                    } else {
                        logger.info(`[Invoice Subscriber] Could not find order ID in payment collection. Attempting to find order by payment collection ID...`)

                        // Query orders with payment collections and filter manually
                        try {
                            const { data: orders } = await query.graph({
                                entity: "order",
                                fields: ["id", "payment_collections.id"],
                                filters: {},
                            }) as any

                            if (orders && orders.length > 0) {
                                logger.info(`[Invoice Subscriber] Found ${orders.length} orders, searching for payment collection ID: ${payment.payment_collection_id}`)

                                for (const order of orders) {
                                    if (order.payment_collections && Array.isArray(order.payment_collections)) {
                                        const hasMatchingPaymentCollection = order.payment_collections.some((pc: any) =>
                                            pc && pc.id === payment.payment_collection_id
                                        );

                                        if (hasMatchingPaymentCollection) {
                                            orderId = order.id
                                            logger.info(`[Invoice Subscriber] Found order ID ${orderId} with matching payment collection`)
                                            break
                                        }
                                    }
                                }

                                if (!orderId) {
                                    logger.info(`[Invoice Subscriber] No order found with payment collection ID: ${payment.payment_collection_id}`)
                                }
                            } else {
                                logger.info(`[Invoice Subscriber] No orders found in database`)
                            }
                        } catch (orderError) {
                            logger.error(`[Invoice Subscriber] Error querying orders by payment collection:`, orderError)
                        }
                    }
                }
            } catch (queryError) {
                logger.error(`[Invoice Subscriber] Error querying payment collection:`, queryError)
            }
        }

        // Also check payment.data for order_id (some payment providers store it there)
        if (!orderId && payment.data && typeof payment.data === 'object' && payment.data.order_id) {
            orderId = payment.data.order_id
            logger.info(`[Invoice Subscriber] Found order ID in payment.data: ${orderId}`)
        }

        if (!orderId) {
            logger.warn(`[Invoice Subscriber] No order ID found for payment ${payment.id}. Payment keys: ${Object.keys(payment)}`)
            logger.warn(`[Invoice Subscriber] Payment collection ID: ${payment.payment_collection_id}`)
            logger.warn(`[Invoice Subscriber] Payment data: ${JSON.stringify(payment.data)}`)
            return
        }

        // Get the order with items
        // Fetch 1: Basic info and relations (items, summary, etc.)
        // Note: Medusa v2 query engine cannot return relations and calculated root fields in one call
        const { data: ordersBasic } = await query.graph({
            entity: "order",
            fields: [
                "id",
                "display_id",
                "status",
                "email",
                "currency_code",
                "created_at",
                "items.*",
                "summary.*",
                "shipping_methods.*",
                "shipping_address.*",
                "billing_address.*",
            ],
            filters: {
                id: orderId,
            },
        })

        if (!ordersBasic || ordersBasic.length === 0) {
            logger.warn(`[Invoice Subscriber] Order ${orderId} info not found for payment ${payment.id}`)
            return
        }

        // Fetch 2: Explicit calculated total fields
        const { data: ordersTotals } = await query.graph({
            entity: "order",
            fields: [
                "id",
                "item_subtotal",
                "item_total",
                "item_tax_total",
                "shipping_subtotal",
                "shipping_total",
                "shipping_tax_total",
                "tax_total",
                "discount_total",
                "discount_tax_total",
                "total",
                "paid_total",
                "refundable_total"
            ],
            filters: {
                id: orderId,
            },
        })

        if (!ordersTotals || ordersTotals.length === 0) {
            logger.warn(`[Invoice Subscriber] Order ${orderId} totals not found for payment ${payment.id}`)
            return
        }

        // Merge the results
        const order = {
            ...ordersBasic[0],
            ...ordersTotals[0]
        }

        logger.info(`[Invoice Subscriber] Merged order data: total=${order.total}, item_subtotal=${order.item_subtotal}`)

        // Check if an invoice already exists for this order and payment
        const invoiceService: InvoiceModuleService = container.resolve(INVOICE_GENERATOR_MODULE)

        const existingInvoices = await invoiceService.listInvoices({
            order_id: orderId,
            payment_id: payment.id,
        })

        // If an invoice already exists, skip
        if (existingInvoices.length > 0) {
            logger.info(`Invoice already exists for order ${orderId} and payment ${payment.id}`)
            return
        }

        // Run the create invoice workflow - pass the merged order data
        const { result: invoice } = await createInvoiceWorkflow(container).run({
            input: {
                order_id: orderId,
                payment_id: payment.id,
                trigger: "automatic",
                generated_by: "system",
                order: order,
                items: order.items || [],
            },
        })

        // Generate PDF for the invoice
        try {
            const items = order.items || []
            // Use type assertion to avoid TypeScript errors
            await invoiceService.generatePdf({
                invoice_id: invoice.id,
                order: order as any,
                items: items as any,
            })
            logger.info(`Successfully generated PDF for invoice ${invoice.id}`)
        } catch (pdfError) {
            logger.error(`Failed to generate PDF for invoice ${invoice.id}:`, pdfError)
            // Continue even if PDF generation fails - the invoice record still exists
        }

        logger.info(`Automatically generated invoice ${invoice.id} for order ${orderId}`)
    } catch (error) {
        logger.error(`Failed to generate invoice for payment ${payment.id}:`, error)
        // Don't throw the error to prevent breaking the payment flow
    }
}

export const config: SubscriberConfig = {
    event: "payment.captured",
    context: {
        subscriberId: "payment-captured-invoice",
    },
}