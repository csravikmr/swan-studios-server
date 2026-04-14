export default async function listInvoices({ container }) {
    const query = container.resolve("query")

    const { data: invoices } = await query.graph({
        entity: "invoice",
        fields: ["id", "display_id", "order_id", "file_name", "file_size"],
        filters: {},
        pagination: { limit: 10 }
    })

    console.log("Found invoices:", invoices.length)
    invoices.forEach(invoice => {
        console.log(`- ${invoice.id} (${invoice.display_id}): order ${invoice.order_id}, file: ${invoice.file_name}`)
    })

    return invoices
}