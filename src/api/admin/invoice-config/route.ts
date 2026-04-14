import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { INVOICE_GENERATOR_MODULE } from "../../../modules/invoice-generator"
import InvoiceModuleService from "../../../modules/invoice-generator/service"

export const UpdateInvoiceConfigSchema = z.object({
    company_name: z.string().optional(),
    company_address: z.string().optional(),
    company_phone: z.string().optional(),
    company_email: z.string().optional(),
    company_logo: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    auto_generate_on_payment: z.boolean().optional(),
    send_email_with_invoice: z.boolean().optional(),
    email_template_id: z.string().optional().nullable(),
    tax_number: z.string().optional().nullable(),
    business_number: z.string().optional().nullable(),
    payment_terms: z.string().optional().nullable(),
    invoice_prefix: z.string().optional(),
    next_invoice_number: z.number().optional(),
})

type UpdateInvoiceConfigInput = z.infer<typeof UpdateInvoiceConfigSchema>

export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
): Promise<void> {
    const invoiceService: InvoiceModuleService =
        req.scope.resolve(INVOICE_GENERATOR_MODULE)

    const configs = await invoiceService.listInvoiceConfigs({})

    res.status(200).json({ config: configs[0] || null })
}

export async function POST(
    req: MedusaRequest<UpdateInvoiceConfigInput>,
    res: MedusaResponse
): Promise<void> {
    console.log('POST /admin/invoice-config received')
    console.log('req.body type:', typeof req.body)
    console.log('req.body:', req.body)

    let validatedBody: UpdateInvoiceConfigInput

    // Helper to robustly parse JSON from request body
    const parseRequestBody = (body: any): any => {
        // If body is already an object, return it
        if (typeof body === 'object' && body !== null) {
            console.log('parseRequestBody: body is already object')
            return body
        }

        // If body is a string, try to parse it
        if (typeof body === 'string') {
            console.log('parseRequestBody: body is string, length:', body.length)
            let parsed = body
            // Try to parse up to 2 levels to handle double-quoted JSON
            for (let i = 0; i < 2; i++) {
                try {
                    parsed = JSON.parse(parsed)
                    console.log(`parseRequestBody: level ${i} parsed result type:`, typeof parsed)
                    // If parsed is now an object, return it
                    if (typeof parsed === 'object' && parsed !== null) {
                        console.log('parseRequestBody: returning object')
                        return parsed
                    }
                    // If parsed is still a string, continue loop
                    if (typeof parsed === 'string') {
                        console.log('parseRequestBody: still a string, continuing')
                        continue
                    }
                } catch (err) {
                    console.log(`parseRequestBody: level ${i} parse error:`, err.message)
                    // If parsing fails, break
                    break
                }
            }
        }

        // If we couldn't parse, return the original body
        console.log('parseRequestBody: returning original body')
        return body
    }

    // Try to use validatedBody if available
    if (req.validatedBody) {
        validatedBody = req.validatedBody
        console.log('Using req.validatedBody:', validatedBody)
    } else {
        console.log('req.validatedBody not available, parsing raw body')
        // Parse and validate the raw body
        const rawBody = req.body
        const parsedBody = parseRequestBody(rawBody)
        console.log('parsedBody:', parsedBody, 'type:', typeof parsedBody)

        if (typeof parsedBody === 'object' && parsedBody !== null) {
            try {
                validatedBody = UpdateInvoiceConfigSchema.parse(parsedBody)
                console.log('Schema validation successful:', validatedBody)
            } catch (parseError) {
                console.log('Schema validation error:', parseError.message)
                res.status(400).json({
                    message: "Invalid request body",
                    error: parseError.message
                })
                return
            }
        } else {
            console.log('Could not parse body as object')
            res.status(400).json({
                message: "Invalid request body",
                error: "Could not parse request body as JSON"
            })
            return
        }
    }

    const invoiceService: InvoiceModuleService =
        req.scope.resolve(INVOICE_GENERATOR_MODULE)

    const configs = await invoiceService.listInvoiceConfigs({})
    const existingConfig = configs[0]

    if (existingConfig) {
        // Update existing config
        const updated = await invoiceService.updateInvoiceConfigs([{
            id: existingConfig.id,
            ...validatedBody,
        }])
        res.status(200).json({ config: updated[0] })
    } else {
        // Create new config
        const created = await invoiceService.createInvoiceConfigs([validatedBody])
        res.status(201).json({ config: created[0] })
    }
}