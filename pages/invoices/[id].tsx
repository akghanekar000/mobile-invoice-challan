import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function InvoiceView() {
  const router = useRouter()
  const { id } = router.query
  const [invoice, setInvoice] = useState(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/invoices/${id}`).then((r) => r.json()).then(setInvoice)
  }, [id])

  if (!invoice) return <div className="p-4">Loading...</div>

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Invoice {invoice.number}</h1>
          <div>{new Date(invoice.date).toLocaleDateString()}</div>
        </div>
        <div>
          <a href={`/api/invoices/${invoice.id}/pdf`} className="inline-block bg-blue-600 text-white px-3 py-2 rounded">Download PDF</a>
        </div>
      </div>

      <section className="mt-4">
        <h2 className="font-semibold">Bill To</h2>
        <div>{invoice.customerName}</div>
        <div>{invoice.customerEmail}</div>
        <div>{invoice.customerPhone}</div>
        <div>{invoice.customerAddress}</div>
      </section>

      <section className="mt-4">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Description</th>
              <th className="py-2">Qty</th>
              <th className="py-2">Unit</th>
              <th className="py-2">Tax</th>
              <th className="py-2">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it) => (
              <tr key={it.id} className="border-b">
                <td className="py-2">{it.description}</td>
                <td className="py-2">{it.quantity}</td>
                <td className="py-2">{it.unitPrice}</td>
                <td className="py-2">{it.taxPercent}%</td>
                <td className="py-2">{it.lineTotal}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 text-right">
          <div>Subtotal: {invoice.subtotal}</div>
          <div>Tax: {invoice.totalTax}</div>
          <div className="font-bold">Total: {invoice.total}</div>
        </div>
      </section>
    </div>
  )
}
