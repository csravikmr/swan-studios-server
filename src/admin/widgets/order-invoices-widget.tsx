import { useState, useEffect, useRef } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Badge, Alert, toast } from "@medusajs/ui"
import { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../lib/sdk"
import { ArrowDownTray, DocumentText, ArrowPath } from "@medusajs/icons"

type Invoice = {
    id: string
    display_id: number
    order_id: string
    status: string
    file_name: string
    generated_at: string
    trigger: string
    email_sent: boolean
}

type InvoicesResponse = {
    invoices: Invoice[]
}

const OrderInvoicesWidget = ({ data }: DetailWidgetProps<AdminOrder>) => {
    const queryClient = useQueryClient()
    const orderId = data.id
    
    // Track initial invoice count to detect new background invoices
    const initialInvoicesLoaded = useRef(false)
    const [initialCount, setInitialCount] = useState<number | null>(null)
    
    // Track which invoices we've already triggered for sending in this session
    const triggeredEmailsRef = useRef<Set<string>>(new Set())

    const { data: response, isLoading, error } = useQuery({
        queryKey: ["order-invoices", orderId],
        queryFn: async () => {
            const result = await sdk.client.fetch<InvoicesResponse>(
                `/admin/invoices?filters=${JSON.stringify({ order_id: orderId })}`
            )
            return result
        },
        // Poll every 5 seconds if payment is captured but no invoices exist yet
        refetchInterval: (query) => {
            const invoices = query.state.data?.invoices
            const isCaptured = data.payment_status === "captured"
            return (!invoices || invoices.length === 0) && isCaptured ? 3000 : false
        }
    })

    const invoices = response?.invoices || []

    // Detect new background invoices and refresh
    useEffect(() => {
        if (isLoading || !response) return

        if (!initialInvoicesLoaded.current) {
            setInitialCount(invoices.length)
            initialInvoicesLoaded.current = true
            return
        }

        // If the number of invoices has increased, it means a background 
        // process (or our polling) found a new one.
        if (initialCount !== null && invoices.length > initialCount) {
            toast.success("New invoice detected. Refreshing...")
            setTimeout(() => {
                window.location.reload()
            }, 1500)
        }
    }, [invoices.length, isLoading, response, initialCount])

    const createInvoiceMutation = useMutation({
        mutationFn: async () => {
            const result = await sdk.client.fetch<{ invoice: Invoice }>(
                "/admin/invoices",
                {
                    method: "POST",
                    body: {
                        order_id: orderId,
                        trigger: "manual",
                        generated_by: "admin",
                    },
                }
            )
            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["order-invoices", orderId] })
            toast.success("Invoice generated successfully")
            // Refresh the page to ensure all sections are updated
            setTimeout(() => {
                window.location.reload()
            }, 1000)
        },
        onError: (err) => {
            console.error("Error creating invoice:", err)
            toast.error("Failed to generate invoice")
        }
    })

    const sendEmailMutation = useMutation({
        mutationFn: async (invoiceId: string) => {
            const result = await sdk.client.fetch<{ success: boolean; message: string }>(
                `/admin/invoices/${invoiceId}/send-email`,
                {
                    method: "POST",
                }
            )
            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["order-invoices", orderId] })
            toast.success("Invoice email sent to customer")
        },
        onError: (err) => {
            console.error("Error sending invoice email:", err)
            toast.error("Failed to send invoice email")
        }
    })

    // Automatic trigger for unsent invoices
    useEffect(() => {
        if (isLoading || !response || invoices.length === 0) return

        // Find the latest invoice that hasn't been emailed yet
        const latestUnsentInvoice = invoices.find(
            (i) => i.status === "latest" && !i.email_sent
        )

        // Only trigger if:
        // 1. We have an unsent latest invoice
        // 2. We haven't already triggered it in this component mount session
        // 3. The mutation isn't already pending
        if (
            latestUnsentInvoice && 
            !triggeredEmailsRef.current.has(latestUnsentInvoice.id) && 
            !sendEmailMutation.isPending
        ) {
            console.log(`[Admin] Automatically triggering email for invoice: ${latestUnsentInvoice.id}`)
            triggeredEmailsRef.current.add(latestUnsentInvoice.id)
            sendEmailMutation.mutate(latestUnsentInvoice.id)
        }
    }, [invoices, isLoading, response, sendEmailMutation.isPending])

    const downloadInvoice = async (invoiceId: string) => {
        try {
            console.log(`Starting download for invoice: ${invoiceId}`)

            // Try using direct fetch instead of sdk.client.fetch
            // sdk.client.fetch might not handle binary responses correctly
            const apiUrl = `/admin/invoices/${invoiceId}/download`
            console.log(`Fetching from URL: ${apiUrl}`)

            const response = await fetch(apiUrl, {
                method: 'GET',
                credentials: 'include', // Include cookies for authentication
                headers: {
                    'Accept': 'application/pdf',
                },
            })

            console.log(`Response status: ${response.status} ${response.statusText}`)
            console.log(`Response headers:`, Object.fromEntries(response.headers.entries()))

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'No error text')
                console.error(`Response not OK: ${response.status} ${response.statusText}`, errorText)
                throw new Error(`Failed to download invoice: ${response.status} ${response.statusText}`)
            }

            // Get the blob from the response
            console.log('Creating blob from response...')
            const blob = await response.blob()
            console.log(`Blob created: type=${blob.type}, size=${blob.size} bytes`)

            if (blob.size === 0) {
                throw new Error("Empty PDF blob received")
            }

            // Get the filename from Content-Disposition header or generate one
            const contentDisposition = response.headers.get('Content-Disposition')
            let fileName = `invoice-${invoiceId}.pdf`

            if (contentDisposition) {
                console.log(`Content-Disposition header: ${contentDisposition}`)
                const match = contentDisposition.match(/filename="(.+)"/)
                if (match && match[1]) {
                    fileName = match[1]
                }
            }

            console.log(`Download filename: ${fileName}`)

            // Create a download link and trigger download
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = fileName
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)

            // Show success message
            console.log('Invoice download triggered successfully')
            toast.success("Invoice downloaded successfully")
        } catch (err) {
            console.error("Error downloading invoice:", err)
            toast.error("Failed to download invoice")
        }
    }



    return (
        <Container className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
                <Heading level="h2">Invoices</Heading>
                <Button
                    variant="secondary"
                    size="small"
                    onClick={() => createInvoiceMutation.mutate()}
                    disabled={createInvoiceMutation.isPending}
                >
                    {createInvoiceMutation.isPending ? (
                        <>
                            <ArrowPath className="animate-spin mr-2" />
                            Creating...
                        </>
                    ) : (
                        <>
                            <DocumentText className="mr-2" />
                            Generate Invoice
                        </>
                    )}
                </Button>
            </div>

            <div className="px-6 py-4">
                {isLoading && (
                    <div className="flex items-center justify-center py-8">
                        <p className="text-ui-fg-subtle">Loading invoices...</p>
                    </div>
                )}

                {error && (
                    <Alert variant="error" dismissible className="mb-4">
                        Failed to load invoices. Please try again.
                    </Alert>
                )}

                {!isLoading && invoices.length === 0 && (
                    <div className="text-center py-8">
                        <DocumentText className="mx-auto h-12 w-12 text-ui-fg-muted mb-4" />
                        <p className="text-ui-fg-subtle mb-2">No invoices generated yet</p>
                        <p className="text-ui-fg-muted text-sm">
                            Click "Generate Invoice" to create an invoice for this order
                        </p>
                    </div>
                )}

                {invoices.length > 0 && (
                    <div className="space-y-4">
                        {invoices.map((invoice) => (
                            <div
                                key={invoice.id}
                                className="flex items-center justify-between p-4 border rounded-lg"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-ui-bg-base rounded-lg p-3 border">
                                        <DocumentText className="h-6 w-6 text-ui-fg-base" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium">{invoice.file_name}</p>
                                            <Badge
                                                color={
                                                    invoice.status === "latest" ? "green" : "orange"
                                                }
                                            >
                                                {invoice.status}
                                            </Badge>
                                            {invoice.email_sent && (
                                                <Badge color="blue">Email Sent</Badge>
                                            )}
                                        </div>
                                        <p className="text-ui-fg-subtle text-sm">
                                            Generated {new Date(invoice.generated_at).toLocaleDateString()} •
                                            Trigger: {invoice.trigger}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="secondary"
                                        size="small"
                                        onClick={() => downloadInvoice(invoice.id)}
                                    >
                                        <ArrowDownTray className="mr-2" />
                                        Download
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="small"
                                        onClick={() => sendEmailMutation.mutate(invoice.id)}
                                        disabled={sendEmailMutation.isPending}
                                    >
                                        {sendEmailMutation.isPending ? (
                                            <ArrowPath className="animate-spin h-4 w-4" />
                                        ) : (
                                            <DocumentText className="h-4 w-4 mr-2" />
                                        )}
                                        {invoice.email_sent ? "Resend Email" : "Send Email"}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-6 pt-6 border-t">
                    <Heading level="h3" className="mb-4">Invoice Information</Heading>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-ui-fg-subtle">Order ID</p>
                            <p className="font-mono">{orderId}</p>
                        </div>
                        <div>
                            <p className="text-ui-fg-subtle">Total Invoices</p>
                            <p className="font-medium">{invoices.length}</p>
                        </div>
                        <div>
                            <p className="text-ui-fg-subtle">Latest Invoice</p>
                            <p className="font-medium">
                                {invoices.find(i => i.status === "latest")?.file_name || "None"}
                            </p>
                        </div>
                        <div>
                            <p className="text-ui-fg-subtle">Auto-generation</p>
                            <p className="font-medium">
                                {data.payment_status === "captured" ? "Payment captured - eligible" : "Not eligible"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Container>
    )
}

export const config = defineWidgetConfig({
    zone: "order.details.after",
})

export default OrderInvoicesWidget