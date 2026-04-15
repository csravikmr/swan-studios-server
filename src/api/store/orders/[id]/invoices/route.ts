import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
): Promise<void> {
    try {
        const { id: order_id } = req.params;
        const query = req.scope.resolve("query");

        // TODO: Add customer authorization check here
        // Verify that the current customer owns this order

        const { data: invoices } = await query.graph({
            entity: "invoice",
            fields: ["*"],
            filters: {
                order_id,
            },
            pagination: {
                skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
                take: req.query.take ? parseInt(req.query.take as string) : 50,
                order: {
                    generated_at: "DESC",
                },
            },
        });

        res.status(200).json({ invoices });
    } catch (error) {
        console.error("Error fetching order invoices:", error);
        res.status(500).json({ message: "Failed to fetch invoices" });
    }
}