import type { LineItem } from "../db/schema.js";

export const KINDS = ["invoice", "challan"] as const;
export type Kind = (typeof KINDS)[number];

const num = (v: unknown, fallback = 0) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
};
const str = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);

export function cleanItems(raw: unknown): LineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((i) => ({
      description: str(i?.description, 200),
      quantity: Math.max(0, num(i?.quantity, 1)),
      unit: str(i?.unit, 20),
      rate: Math.max(0, num(i?.rate)),
    }))
    .filter((i) => i.description)
    .slice(0, 100);
}

export function cleanDocument(body: any) {
  const kind: Kind = KINDS.includes(body?.kind) ? body.kind : "invoice";
  const items = cleanItems(body?.items);
  const taxRate = Math.min(100, Math.max(0, num(body?.taxRate)));
  const subtotal = items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const total = kind === "invoice" ? subtotal * (1 + taxRate / 100) : subtotal;
  const issueDate = /^\d{4}-\d{2}-\d{2}$/.test(body?.issueDate)
    ? body.issueDate
    : new Date().toISOString().slice(0, 10);
  return {
    kind,
    number: str(body?.number, 40),
    issueDate,
    customerName: str(body?.customerName, 200),
    customerPhone: str(body?.customerPhone, 40),
    customerAddress: str(body?.customerAddress, 500),
    items,
    taxRate: taxRate.toFixed(2),
    notes: str(body?.notes, 2000),
    total: total.toFixed(2),
  };
}

export const bad = (message: string, status = 400) => Response.json({ error: message }, { status });
