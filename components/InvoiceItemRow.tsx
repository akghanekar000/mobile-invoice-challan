export default function InvoiceItemRow({ item, onChange, onRemove }) {
  return (
    <div className="grid grid-cols-6 gap-2 items-end">
      <div className="col-span-3">
        <label className="block text-xs">Description</label>
        <input value={item.description} onChange={(e) => onChange({ description: e.target.value })} className="border px-2 py-1 rounded w-full" />
      </div>
      <div>
        <label className="block text-xs">Qty</label>
        <input type="number" value={item.quantity} onChange={(e) => onChange({ quantity: Number(e.target.value) })} className="border px-2 py-1 rounded w-full" />
      </div>
      <div>
        <label className="block text-xs">Unit</label>
        <input type="number" step="0.01" value={item.unitPrice} onChange={(e) => onChange({ unitPrice: Number(e.target.value) })} className="border px-2 py-1 rounded w-full" />
      </div>
      <div>
        <label className="block text-xs">Tax %</label>
        <input type="number" value={item.taxPercent} onChange={(e) => onChange({ taxPercent: Number(e.target.value) })} className="border px-2 py-1 rounded w-full" />
      </div>
      <div className="col-span-1">
        <button type="button" onClick={onRemove} className="text-red-600 text-sm">Remove</button>
      </div>
    </div>
  )
}
