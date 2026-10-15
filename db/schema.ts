import { pgTable, serial, text, timestamp, jsonb, numeric, date, integer } from "drizzle-orm/pg-core";

export type LineItem = { description: string; quantity: number; unit: string; rate: number };

export const documents = pgTable("documents", {
  id: serial().primaryKey(),
  kind: text().notNull(), // "invoice" | "challan"
  number: text().notNull(),
  issueDate: date("issue_date").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull().default(""),
  customerAddress: text("customer_address").notNull().default(""),
  items: jsonb().$type<LineItem[]>().notNull().default([]),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  notes: text().notNull().default(""),
  total: numeric({ precision: 14, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const business = pgTable("business", {
  id: integer().primaryKey(),
  name: text().notNull().default(""),
  phone: text().notNull().default(""),
  address: text().notNull().default(""),
  gstin: text().notNull().default(""),
});
