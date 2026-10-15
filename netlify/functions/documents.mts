import type { Config, Context } from "@netlify/functions";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { documents } from "../../db/schema.js";
import { cleanDocument, bad, KINDS } from "../../lib/document.js";

async function nextNumber(kind: "invoice" | "challan") {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documents)
    .where(eq(documents.kind, kind));
  return `${kind === "invoice" ? "INV" : "DC"}-${String(count + 1).padStart(4, "0")}`;
}

export default async (req: Request, context: Context) => {
  const id = context.params.id ? parseInt(context.params.id, 10) : null;
  if (context.params.id && !Number.isInteger(id)) return bad("Invalid id");

  if (!id) {
    if (req.method === "GET") {
      const kind = new URL(req.url).searchParams.get("kind");
      const rows = await db
        .select()
        .from(documents)
        .where(KINDS.includes(kind as any) ? eq(documents.kind, kind!) : undefined)
        .orderBy(desc(documents.createdAt))
        .limit(200);
      return Response.json(rows);
    }
    if (req.method === "POST") {
      const doc = cleanDocument(await req.json().catch(() => ({})));
      if (!doc.customerName) return bad("Customer name is required");
      if (!doc.items.length) return bad("Add at least one item");
      if (!doc.number) doc.number = await nextNumber(doc.kind);
      const [row] = await db.insert(documents).values(doc).returning();
      return Response.json(row, { status: 201 });
    }
    return bad("Method not allowed", 405);
  }

  if (req.method === "GET") {
    const [row] = await db.select().from(documents).where(eq(documents.id, id));
    return row ? Response.json(row) : bad("Not found", 404);
  }
  if (req.method === "PUT") {
    const doc = cleanDocument(await req.json().catch(() => ({})));
    if (!doc.customerName) return bad("Customer name is required");
    if (!doc.items.length) return bad("Add at least one item");
    const [existing] = await db.select().from(documents).where(eq(documents.id, id));
    if (!existing) return bad("Not found", 404);
    if (!doc.number) doc.number = existing.number;
    const [row] = await db
      .update(documents)
      .set(doc)
      .where(eq(documents.id, id))
      .returning();
    return Response.json(row);
  }
  if (req.method === "DELETE") {
    await db.delete(documents).where(eq(documents.id, id));
    return new Response(null, { status: 204 });
  }
  return bad("Method not allowed", 405);
};

export const config: Config = {
  path: ["/api/documents", "/api/documents/:id"],
};
