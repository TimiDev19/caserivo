import { createClient } from '@/lib/supabase/server';

type InvoiceRow = {
  id: string; invoice_number: string; currency: string; subtotal_minor: number; total_minor: number;
  status: string; issued_at: string | null; due_at: string | null; firm_snapshot: Record<string, string | null>;
  client_snapshot: Record<string, string | null>; payment_account_number: string | null;
  payment_bank_name: string | null; payment_account_name: string | null;
};

const clean = (value: unknown) => String(value ?? '').normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/[\r\n\t]+/g, ' ').trim();
const amount = (minor: number) => (Number(minor ?? 0) / 100).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function makePdf(lines: string[]) {
  const pages: string[][] = [[]];
  for (const line of lines) {
    if (pages[pages.length - 1].length >= 48) pages.push([]);
    pages[pages.length - 1].push(line);
  }
  const objects: string[] = ['', '', ''];
  const add = (object: string) => { objects.push(object); return objects.length - 1; };
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds: number[] = [];
  for (const pageLines of pages) {
    const stream = pageLines.map((line, index) => `BT /F1 ${index === 0 ? 20 : 11} Tf 54 ${790 - index * 15} Td (${clean(line).replace(/([\\()])/g, '\\$1')}) Tj ET`).join('\n');
    const contentId = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`));
  }
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  let output = '%PDF-1.4\n';
  const offsets = [0];
  for (let id = 1; id < objects.length; id++) { offsets[id] = output.length; output += `${id} 0 obj\n${objects[id]}\nendobj\n`; }
  const xrefOffset = output.length;
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) output += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(output);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = await createClient();
  if (!db) return new Response('Supabase is not configured.', { status: 503 });
  const { data: { user } } = await db.auth.getUser();
  if (!user) return new Response('Sign in to download this invoice.', { status: 401 });
  const { data: invoice, error } = await db.from('invoices').select('id,invoice_number,currency,subtotal_minor,total_minor,status,issued_at,due_at,firm_snapshot,client_snapshot,payment_account_number,payment_bank_name,payment_account_name').eq('id', id).maybeSingle();
  if (error || !invoice) return new Response('Invoice not found.', { status: 404 });
  const record = invoice as InvoiceRow;
  const { data: items, error: itemError } = await db.from('invoice_items').select('description,quantity,line_total_minor').eq('invoice_id', id).order('id');
  if (itemError) return new Response('Could not load invoice services.', { status: 500 });

  const lines = [
    clean(record.firm_snapshot?.name) || 'Caserivo', clean(record.firm_snapshot?.address), clean(record.firm_snapshot?.email),
    clean(record.firm_snapshot?.phone), '', `INVOICE  ${record.invoice_number}`, '',
    `Bill to: ${record.client_snapshot?.name || 'Client'}`, clean(record.client_snapshot?.email), clean(record.client_snapshot?.address), '',
    `Issued: ${record.issued_at ? new Date(record.issued_at).toLocaleDateString() : '—'}`,
    `Due: ${record.due_at ? new Date(record.due_at).toLocaleDateString() : '—'}`, '', 'SERVICE',
    ...(items ?? []).flatMap((item) => [`${clean(item.description)}  |  ${record.currency.trim()} ${amount(item.line_total_minor)}`]),
    '', `TOTAL  ${record.currency.trim()} ${amount(record.total_minor)}`, '', 'PAYMENT INFORMATION',
    `Bank: ${record.payment_bank_name || '—'}`, `Account name: ${record.payment_account_name || '—'}`,
    `Account number: ${record.payment_account_number || '—'}`,
    clean(record.firm_snapshot?.invoice_instructions),
  ];
  const bytes = makePdf(lines);
  return new Response(bytes, { headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${record.invoice_number.replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf"`,
    'Cache-Control': 'private, no-store',
  } });
}
