import { useState } from 'react'
import { useRouter } from 'next/router'
import InvoiceForm from '../../components/InvoiceForm'

export default function NewInvoicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleCreate(data) {
    setLoading(true)
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    setLoading(false)
    if (res.ok) {
      router.push(`/invoices/${json.id}`)
    } else {
      alert(json.error || 'Failed')
    }
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Create Invoice</h1>
      <InvoiceForm onSubmit={handleCreate} loading={loading} />
    </div>
  )
}
