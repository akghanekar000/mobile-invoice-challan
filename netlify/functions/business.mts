import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { business } from "../../db/schema.js";

const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export default async (req: Request) => {
  if (req.method === "GET") {
    const [row] = await db.select().from(business).where(eq(business.id, 1));
    return Response.json(row ?? { id: 1, name: "", phone: "", address: "", gstin: "" });
  }
  if (req.method === "PUT") {
    const body = await req.json().catch(() => ({}));
    const values = {
      name: s(body.name, 200),
      phone: s(body.phone, 40),
      address: s(body.address, 500),
      gstin: s(body.gstin, 20),
    };
    const [row] = await db
      .insert(business)
      .values({ id: 1, ...values })
      .onConflictDoUpdate({ target: business.id, set: values })
      .returning();
    return Response.json(row);
  }
  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = { path: "/api/business" };
