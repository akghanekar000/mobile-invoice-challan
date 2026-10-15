import { useState } from 'react'
import InvoiceItemRow from './InvoiceItemRow'

export default function InvoiceForm({ onSubmit, loading }) {
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [items, setItems] = useState([
    { id: Date.now(), description: '', quantity: 1, unitPrice: 0, taxPercent: 0 },
  ])

  function updateItem(id, patch) {
    setItems((s) => s.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  function addItem() {
    setItems((s) => [...s, { id: Date.now(), description: '', quantity: 1, unitPrice: 0, taxPercent: 0 }])
  }

  function removeItem(id) {
    setItems((s) => s.filter((it) => it.id !== id))
  }

  function computeTotals() {
    let subtotal = 0
    let totalTax = 0
    items.forEach((it) => {
      const q = Number(it.quantity || 0)
      const u = Number(it.unitPrice || 0)
      const tax = Number(it.taxPercent || 0)
      const line = q * u
      const taxAmount = (line * tax) / 100
      subtotal += line
      totalTax += taxAmount
    })
    return { subtotal: subtotal.toFixed(2), totalTax: totalTax.toFixed(2), total: (subtotal + Number(totalTax)).toFixed(2) }
  }

  const totals = computeTotals()

  function submit(e) {
    e.preventDefault()
    const payload = {
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      items: items.map((it) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice, taxPercent: it.taxPercent })),
    }
    onSubmit(payload)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Customer name</label>
        <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-1 block w-full border px-2 py-2 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Email" className="border px-2 py-2 rounded" />
        <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Phone" className="border px-2 py-2 rounded" />
        <input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Address" className="border px-2 py-2 rounded" />
      </div>

      <div>
        <h3 className="font-semibold mb-2">Items</h3>
        <div className="space-y-2">
          {items.map((it) => (
            <InvoiceItemRow key={it.id} item={it} onChange={(patch) => updateItem(it.id, patch)} onRemove={() => removeItem(it.id)} />
          ))}
        </div>
        <button type="button" onClick={addItem} className="mt-2 text-sm text-blue-600">+ Add item</button>
      </div>

      <div className="text-right">
        <div>Subtotal: {totals.subtotal}</div>
        <div>Tax: {totals.totalTax}</div>
        <div className="font-bold">Total: {totals.total}</div>
      </div>

      <div>
        <button disabled={loading} type="submit" className="bg-green-600 text-white px-4 py-2 rounded">{loading ? 'Creating...' : 'Create Invoice'}</button>
      </div>
    </form>
  )
}
