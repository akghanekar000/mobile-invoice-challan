import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const body = req.body
      // Basic validation
      if (!body.customerName || !Array.isArray(body.items) || body.items.length === 0) {
        return res.status(400).json({ error: 'Missing customerName or items' })
      }

      // Compute totals
      let subtotal = 0
      let totalTax = 0
      const itemsData = body.items.map((it) => {
        const quantity = Number(it.quantity || 1)
        const unitPrice = Number(it.unitPrice || 0)
        const taxPercent = Number(it.taxPercent || 0)
        const lineSubtotal = quantity * unitPrice
        const taxAmount = (lineSubtotal * taxPercent) / 100
        const lineTotal = lineSubtotal + taxAmount
        subtotal += lineSubtotal
        totalTax += taxAmount
        return {
          description: it.description || '',
          quantity,
          unitPrice: unitPrice.toFixed(2),
          taxPercent,
          taxAmount: taxAmount.toFixed(2),
          lineTotal: lineTotal.toFixed(2),
        }
      })

      const total = subtotal + totalTax

      // Generate a number if not provided
      const nextNumber = body.number || `INV-${Math.floor(1000 + Math.random() * 9000)}`

      const created = await prisma.invoice.create({
        data: {
          number: nextNumber,
          date: body.date ? new Date(body.date) : new Date(),
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          customerName: body.customerName,
          customerEmail: body.customerEmail || null,
          customerPhone: body.customerPhone || null,
          customerAddress: body.customerAddress || null,
          status: body.status || 'DRAFT',
          subtotal: subtotal.toFixed(2),
          totalTax: totalTax.toFixed(2),
          total: total.toFixed(2),
          items: {
            create: itemsData.map((it) => ({
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              taxPercent: it.taxPercent,
              taxAmount: it.taxAmount,
              lineTotal: it.lineTotal,
            })),
          },
        },
        include: { items: true },
      })

      return res.status(201).json(created)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Server error' })
    }
  }

  if (req.method === 'GET') {
    // List invoices (simple)
    const invoices = await prisma.invoice.findMany({ take: 50, orderBy: { createdAt: 'desc' } })
    return res.json(invoices)
  }

  res.setHeader('Allow', ['POST', 'GET'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
