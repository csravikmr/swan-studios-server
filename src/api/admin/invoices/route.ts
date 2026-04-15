import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createInvoiceWorkflow } from "../../../workflows/create-invoice"
import { z } from "@medusajs/framework/zod"

export const CreateInvoiceSchema = z.object({
    order_id: z.string(),
    payment_id: z.string().optional(),
    trigger: z.string().default("manual"),
    generated_by: z.string().optional(),
})

type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>

export async function POST(
    req: MedusaRequest<CreateInvoiceInput>,
    res: MedusaResponse
): Promise<void> {
    let validatedBody: CreateInvoiceInput

    // Helper to robustly parse JSON from request body
    const parseRequestBody = (body: any): any => {
        // If body is already an object, return it
        if (typeof body === 'object' && body !== null) {
            return body
        }

        // If body is a string, try to parse it
        if (typeof body === 'string') {
            let parsed = body
            // Try to parse up to 2 levels to handle double-quoted JSON
            for (let i = 0; i < 2; i++) {
                try {
                    parsed = JSON.parse(parsed)
                    // If parsed is now an object, return it
                    if (typeof parsed === 'object' && parsed !== null) {
                        return parsed
                    }
                    // If parsed is still a string, continue loop
                    if (typeof parsed === 'string') {
                        continue
                    }
                } catch {
                    // If parsing fails, break
                    break
                }
            }
        }

        // If we couldn't parse, return the original body
        return body
    }

    // Try to use validatedBody if available
    if (req.validatedBody) {
        validatedBody = req.validatedBody
    } else {
        // If validation fails, try to parse the raw body
        const rawBody = req.body
        const parsedBody = parseRequestBody(rawBody)

        if (typeof parsedBody === 'object' && parsedBody !== null) {
            try {
                validatedBody = CreateInvoiceSchema.parse(parsedBody)
            } catch (parseError) {
                res.status(400).json({
                    message: "Invalid request body",
                    error: parseError.message
                })
                return
            }
        } else {
            res.status(400).json({
                message: "Invalid request body",
                error: "Could not parse request body as JSON"
            })
            return
        }
    }

    const { order_id, payment_id, trigger, generated_by } = validatedBody

    const { result } = await createInvoiceWorkflow(req.scope).run({
        input: {
            order_id,
            payment_id,
            trigger,
            generated_by,
        },
    })

    res.status(201).json({ invoice: result })
}

export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
): Promise<void> {
    const query = req.scope.resolve("query")

    const { data: invoices, metadata } = await query.graph({
        entity: "invoice",
        fields: ["*"],
        pagination: {
            skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
            take: req.query.take ? parseInt(req.query.take as string) : 50,
        },
        filters: req.query.filters ? JSON.parse(req.query.filters as string) : {},
    })

    res.status(200).json({ invoices, metadata })
}