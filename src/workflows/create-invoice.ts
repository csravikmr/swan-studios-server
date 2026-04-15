import {
    createWorkflow,
    WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createInvoiceStep } from "./steps/create-invoice"

export type CreateInvoiceInput = {
    order_id: string
    payment_id?: string
    trigger?: string
    generated_by?: string
    order?: any
    items?: any[]
}

export const createInvoiceWorkflow = createWorkflow(
    "create-invoice",
    (input: CreateInvoiceInput) => {
        const invoice = createInvoiceStep(input)

        return new WorkflowResponse(invoice)
    }
)