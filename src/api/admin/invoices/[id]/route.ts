import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INVOICE_GENERATOR_MODULE } from "../../../../modules/invoice-generator"
import InvoiceModuleService from "../../../../modules/invoice-generator/service"

export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
): Promise<void> {
    const { id } = req.params
    const query = req.scope.resolve("query")

    const { data: invoices } = await query.graph({
        entity: "invoice",
        fields: ["*"],
        filters: {
            id,
        },
    })

    if (!invoices || invoices.length === 0) {
        res.status(404).json({ message: "Invoice not found" })
        return
    }

    res.status(200).json({ invoice: invoices[0] })
}

export async function DELETE(
    req: MedusaRequest,
    res: MedusaResponse
): Promise<void> {
    const { id } = req.params
    const invoiceService: InvoiceModuleService =
        req.scope.resolve(INVOICE_GENERATOR_MODULE)

    await invoiceService.deleteInvoices([id])

    res.status(204).send()
}