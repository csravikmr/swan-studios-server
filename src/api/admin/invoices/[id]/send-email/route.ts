import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { INVOICE_GENERATOR_MODULE } from "../../../../../modules/invoice-generator";
import InvoiceModuleService from "../../../../../modules/invoice-generator/service";
import { sendInvoiceEmail } from "../../../../../lib/email-util";

export async function POST(
    req: MedusaRequest,
    res: MedusaResponse
): Promise<void> {
    const { id } = req.params;
    const logger = req.scope.resolve("logger");
    const query = req.scope.resolve("query");
    const invoiceService: InvoiceModuleService = req.scope.resolve(INVOICE_GENERATOR_MODULE);

    try {
        logger.info(`[Admin] Request to send invoice email for ID: ${id}`);

        // 1. Fetch invoice to get order_id
        const { data: invoices } = await query.graph({
            entity: "invoice",
            fields: ["id", "order_id", "display_id", "file_name", "email_sent", "generated_at"],
            filters: { id },
        });

        if (!invoices || invoices.length === 0) {
            res.status(404).json({ message: "Invoice not found" });
            return;
        }

        const invoice = invoices[0];

        // 2. Prevent duplicate sending - LOCK IMMEDIATELY
        if (invoice.email_sent) {
            logger.info(`[Admin] Invoice ${id} already sent, skipping.`);
            res.status(200).json({ success: true, message: "Email already sent" });
            return;
        }

        // Mark as sent in DB IMMEDIATELY to act as a lock for concurrent requests
        await invoiceService.updateInvoices({
            id: id,
            email_sent: true,
            email_sent_at: new Date(),
        } as any);

        logger.info(`[Admin] Invoice ${id} locked for sending.`);

        // 3. Fetch COMPLETE order details (matching download route logic)
        // Fetch 1: Basic info and relations
        const { data: ordersBasic } = await query.graph({
            entity: "order",
            fields: [
                "id",
                "display_id",
                "email",
                "currency_code",
                "status",
                "summary.*",
                "shipping_methods.*",
                "shipping_address.*",
                "billing_address.*",
                "items.*",
            ],
            filters: { id: invoice.order_id },
        });

        // Fetch 2: Root calculated total fields
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
            filters: { id: invoice.order_id },
        });

        if (!ordersBasic || ordersBasic.length === 0 || !ordersTotals || ordersTotals.length === 0) {
            // Revert lock
            await invoiceService.updateInvoices({ id, email_sent: false, email_sent_at: null } as any);
            res.status(404).json({ message: "Associated order not found" });
            return;
        }

        // Merge the results to get a complete order object
        const order = {
            ...ordersBasic[0],
            ...ordersTotals[0]
        };
        const customerEmail = order.email;

        if (!customerEmail) {
            // Revert lock
            await invoiceService.updateInvoices({ id, email_sent: false, email_sent_at: null } as any);
            logger.warn(`[Admin] No email found for order ${order.id}`);
            res.status(400).json({ message: "Order has no associated email address" });
            return;
        }

        // 4. Generate PDF Buffer with complete data
        const pdfBuffer = await invoiceService.generatePdf({
            invoice_id: id,
            order: order as any,
            items: (order.items || []).filter((item): item is NonNullable<typeof item> => item != null).map(item => ({
                title: item.title || "",
                quantity: item.quantity ?? 0,
                unit_price: item.unit_price ?? 0,
                total: item.total ?? 0,
            })),
        });

        // 5. Send Email
        const fileName = invoice.file_name || `invoice-${invoice.display_id}.pdf`;

        const emailResult = await sendInvoiceEmail({
            to: customerEmail,
            order,
            invoice,
            pdfBuffer,
            fileName,
        });

        if (!emailResult.success) {
            // Revert lock on failure
            await invoiceService.updateInvoices({ id, email_sent: false, email_sent_at: null } as any);
            logger.error(`[Admin] Failed to send invoice email: ${emailResult.error}`);
            res.status(500).json({
                message: "Failed to send email",
                error: emailResult.error
            });
            return;
        }

        logger.info(`[Admin] Invoice ${id} emailed to ${customerEmail} successfully`);

        res.status(200).json({
            success: true,
            message: `Invoice emailed to ${customerEmail}`,
            messageId: emailResult.messageId
        });

    } catch (error) {
        logger.error(`[Admin] Error in send-email route:`, error);
        res.status(500).json({
            message: "Internal server error while sending email",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
}
