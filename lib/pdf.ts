import PDFDocument from 'pdfkit'

export function generateInvoicePDF(res, invoice) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${invoice.number}.pdf"`)

  doc.pipe(res)

  doc.fontSize(20).text(`Invoice ${invoice.number}`, { align: 'left' })
  doc.moveDown()

  doc.fontSize(12).text(`Date: ${new Date(invoice.date).toLocaleDateString()}`)
  if (invoice.dueDate) doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`)
  doc.moveDown()

  doc.text('Bill To:')
  doc.text(invoice.customerName)
  if (invoice.customerEmail) doc.text(invoice.customerEmail)
  if (invoice.customerPhone) doc.text(invoice.customerPhone)
  if (invoice.customerAddress) doc.text(invoice.customerAddress)
  doc.moveDown()

  // Table header
  doc.fontSize(12).text('Description', 40)
  doc.text('Qty', 300, doc.y)
  doc.text('Unit', 350, doc.y)
  doc.text('Tax', 420, doc.y)
  doc.text('Line Total', 480, doc.y)
  doc.moveTo(40, doc.y + 5).lineTo(560, doc.y + 5).stroke()
  doc.moveDown(0.5)

  invoice.items.forEach((it) => {
    doc.text(it.description, 40)
    doc.text(String(it.quantity), 300, doc.y)
    doc.text(String(it.unitPrice), 350, doc.y)
    doc.text(`${it.taxPercent}%`, 420, doc.y)
    doc.text(String(it.lineTotal), 480, doc.y)
    doc.moveDown()
  })

  doc.moveDown()
  doc.text(`Subtotal: ${invoice.subtotal}`, { align: 'right' })
  doc.text(`Tax: ${invoice.totalTax}`, { align: 'right' })
  doc.text(`Total: ${invoice.total}`, { align: 'right' })

  doc.end()
}
