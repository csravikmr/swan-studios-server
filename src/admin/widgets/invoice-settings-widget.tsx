import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Input, Textarea, Label, Switch, Alert } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../lib/sdk"
import { useState } from "react"

type InvoiceConfig = {
    id?: string
    company_name: string
    company_address: string
    company_phone: string
    company_email: string
    company_logo: string | null
    notes: string | null
    auto_generate_on_payment: boolean
    send_email_with_invoice: boolean
    email_template_id: string | null
    tax_number: string | null
    business_number: string | null
    payment_terms: string | null
    invoice_prefix: string
    next_invoice_number: number
}

const InvoiceSettingsWidget = () => {
    const queryClient = useQueryClient()
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState<Partial<InvoiceConfig>>({})
    const [successMessage, setSuccessMessage] = useState<string>("")
    const [errorMessage, setErrorMessage] = useState<string>("")

    const { data: response, isLoading, error } = useQuery({
        queryKey: ["invoice-config"],
        queryFn: async () => {
            const result = await sdk.client.fetch<{ config: InvoiceConfig | null }>(
                "/admin/invoice-config"
            )
            return result
        },
    })

    const updateMutation = useMutation({
        mutationFn: async (data: Partial<InvoiceConfig>) => {
            const result = await sdk.client.fetch<{ config: InvoiceConfig }>(
                "/admin/invoice-config",
                {
                    method: "POST",
                    body: data,
                }
            )
            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoice-config"] })
            setIsEditing(false)
            setSuccessMessage("Invoice settings saved successfully!")
            setErrorMessage("")
            setTimeout(() => setSuccessMessage(""), 3000)
        },
        onError: (error: any) => {
            console.error("Failed to save invoice settings:", error)
            setErrorMessage(error.message || "Failed to save invoice settings. Please try again.")
            setSuccessMessage("")
        },
    })

    const config = response?.config

    const handleEdit = () => {
        setIsEditing(true)
        setFormData(config || {})
        setErrorMessage("")
    }

    const handleCancel = () => {
        setIsEditing(false)
        setFormData({})
        setErrorMessage("")
    }

    const handleSave = () => {
        updateMutation.mutate(formData)
    }

    const handleChange = (field: keyof InvoiceConfig, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    if (isLoading) {
        return (
            <Container className="p-8">
                <div className="flex items-center justify-center">
                    <p className="text-ui-fg-subtle">Loading invoice settings...</p>
                </div>
            </Container>
        )
    }

    if (error) {
        return (
            <Container className="p-8">
                <Alert variant="error" dismissible>
                    Failed to load invoice settings. Please try again.
                </Alert>
            </Container>
        )
    }

    return (
        <Container className="p-8">
            <div className="flex items-center justify-between mb-6">
                <Heading level="h2">Invoice Settings</Heading>
                {!isEditing ? (
                    <Button variant="secondary" onClick={handleEdit}>
                        Edit Settings
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                )}
            </div>

            {successMessage && (
                <Alert variant="success" dismissible className="mb-6">
                    {successMessage}
                </Alert>
            )}

            {errorMessage && (
                <Alert variant="error" dismissible className="mb-6">
                    {errorMessage}
                </Alert>
            )}

            {!isEditing ? (
                <div className="space-y-4">
                    {config ? (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-ui-fg-subtle">Company Name</Label>
                                    <p className="text-ui-fg-base">{config.company_name || "Not set"}</p>
                                </div>
                                <div>
                                    <Label className="text-ui-fg-subtle">Company Email</Label>
                                    <p className="text-ui-fg-base">{config.company_email || "Not set"}</p>
                                </div>
                                <div>
                                    <Label className="text-ui-fg-subtle">Company Phone</Label>
                                    <p className="text-ui-fg-base">{config.company_phone || "Not set"}</p>
                                </div>
                                <div>
                                    <Label className="text-ui-fg-subtle">Invoice Prefix</Label>
                                    <p className="text-ui-fg-base">{config.invoice_prefix || "INV-"}</p>
                                </div>
                            </div>
                            <div>
                                <Label className="text-ui-fg-subtle">Company Address</Label>
                                <p className="text-ui-fg-base">{config.company_address || "Not set"}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Switch checked={config.auto_generate_on_payment} disabled />
                                    <Label>Auto-generate on payment</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch checked={config.send_email_with_invoice} disabled />
                                    <Label>Send email with invoice</Label>
                                </div>
                            </div>
                        </>
                    ) : (
                        <Alert variant="warning">
                            No invoice settings configured. Click "Edit Settings" to set up your invoice configuration.
                        </Alert>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="company_name">Company Name</Label>
                            <Input
                                id="company_name"
                                value={formData.company_name || ""}
                                onChange={(e) => handleChange("company_name", e.target.value)}
                                placeholder="Your Company Name"
                            />
                        </div>
                        <div>
                            <Label htmlFor="company_email">Company Email</Label>
                            <Input
                                id="company_email"
                                type="email"
                                value={formData.company_email || ""}
                                onChange={(e) => handleChange("company_email", e.target.value)}
                                placeholder="billing@company.com"
                            />
                        </div>
                        <div>
                            <Label htmlFor="company_phone">Company Phone</Label>
                            <Input
                                id="company_phone"
                                value={formData.company_phone || ""}
                                onChange={(e) => handleChange("company_phone", e.target.value)}
                                placeholder="+1 (555) 123-4567"
                            />
                        </div>
                        <div>
                            <Label htmlFor="invoice_prefix">Invoice Prefix</Label>
                            <Input
                                id="invoice_prefix"
                                value={formData.invoice_prefix || "INV-"}
                                onChange={(e) => handleChange("invoice_prefix", e.target.value)}
                                placeholder="INV-"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="company_address">Company Address</Label>
                        <Textarea
                            id="company_address"
                            value={formData.company_address || ""}
                            onChange={(e) => handleChange("company_address", e.target.value)}
                            placeholder="123 Main St, City, State, ZIP"
                            rows={3}
                        />
                    </div>

                    <div>
                        <Label htmlFor="company_logo">Company Logo URL (Optional)</Label>
                        <Input
                            id="company_logo"
                            value={formData.company_logo || ""}
                            onChange={(e) => handleChange("company_logo", e.target.value)}
                            placeholder="https://example.com/logo.png"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="tax_number">Tax Number (Optional)</Label>
                            <Input
                                id="tax_number"
                                value={formData.tax_number || ""}
                                onChange={(e) => handleChange("tax_number", e.target.value)}
                                placeholder="TAX-123456"
                            />
                        </div>
                        <div>
                            <Label htmlFor="business_number">Business Number (Optional)</Label>
                            <Input
                                id="business_number"
                                value={formData.business_number || ""}
                                onChange={(e) => handleChange("business_number", e.target.value)}
                                placeholder="BUS-789012"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="payment_terms">Payment Terms (Optional)</Label>
                        <Input
                            id="payment_terms"
                            value={formData.payment_terms || ""}
                            onChange={(e) => handleChange("payment_terms", e.target.value)}
                            placeholder="Net 30 days"
                        />
                    </div>

                    <div>
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes || ""}
                            onChange={(e) => handleChange("notes", e.target.value)}
                            placeholder="Additional notes for invoices"
                            rows={2}
                        />
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={formData.auto_generate_on_payment || false}
                                onCheckedChange={(checked) => handleChange("auto_generate_on_payment", checked)}
                            />
                            <Label htmlFor="auto_generate">Auto-generate invoices on payment capture</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={formData.send_email_with_invoice || false}
                                onCheckedChange={(checked) => handleChange("send_email_with_invoice", checked)}
                            />
                            <Label htmlFor="send_email">Send email with invoice attachment</Label>
                        </div>
                    </div>
                </div>
            )}
        </Container>
    )
}

export const config = defineWidgetConfig({
    zone: ["order.details.side.before"],
})

export default InvoiceSettingsWidget