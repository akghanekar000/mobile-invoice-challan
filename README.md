# mobile-invoice-challan

**Bahi** — a mobile-first PWA for making GST invoices and delivery challans, with voice input.

- Create, edit, list, search, delete, print/PDF and share invoices and challans
- **Fill by voice**: tap the mic and say e.g. *"Invoice for Ramesh Traders, 10 bags cement at 350, 5 kg nails at 90, 18 percent GST"* — the form fills itself
- Business details (name, address, phone, GSTIN) printed on every document
- Installable on your phone (PWA)

## Stack

- Static frontend in `public/` (vanilla JS, no build step)
- Netlify Functions in `netlify/functions/` (`/api/documents`, `/api/business`, `/api/voice-parse`)
- Netlify Database (Postgres) via Drizzle ORM — schema in `db/schema.ts`, migrations in `netlify/database/migrations/`
- Speech-to-text runs in the browser (Web Speech API, `en-IN`); the transcript is turned into form fields by Claude via Netlify AI Gateway
