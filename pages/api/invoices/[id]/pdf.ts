import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { generateInvoicePDF } from '../../../../lib/pdf'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' })

  if (req.method === 'GET') {
    const invoice = await prisma.invoice.findUnique({ where: { id }, include: { items: true } })
    if (!invoice) return res.status(404).json({ error: 'Not found' })

    return generateInvoicePDF(res, invoice)
  }

  res.setHeader('Allow', ['GET'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
