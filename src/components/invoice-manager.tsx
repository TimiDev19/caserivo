'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { useToast } from '@/components/toast-provider';
import Modal from '@/components/modal';
import { motion } from 'framer-motion';
import { Plus, Search, Trash2, Download, Pencil } from 'lucide-react';

type Client = { id: string; name: string };
type Service = { key: string; description: string; amount: string };
type Invoice = { id: string; invoice_number: string; currency: string; total_minor: number; due_at: string | null; status: string; client_id: string | null; client_snapshot: { name?: string }; payment_account_number: string | null; payment_bank_name: string | null; payment_account_name: string | null };

function minorUnits(value: string) {
  const match = value.trim().match(/^(\d{1,13})(?:\.(\d{0,2}))?$/);
  if (!match) throw new Error('Enter each service amount as a valid number with up to two decimal places.');
  const minor = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0') || '0');
  if (!Number.isSafeInteger(minor) || minor > 9000000000000000) throw new Error('A service amount is too large.');
  return String(minor);
}

function PaymentSwitch({ invoice, disabled, onChange }: { invoice: Invoice; disabled?: boolean; onChange: (isPaid: boolean) => void }) {
  if (invoice.status === 'void') return null;
  const paid = invoice.status === 'paid';
  return <button type="button" role="switch" aria-checked={paid} aria-label={`${invoice.invoice_number}: ${paid ? 'paid' : 'unpaid'}`} title={paid ? 'Mark invoice unpaid' : 'Mark invoice paid'} disabled={disabled} className={`payment-switch${paid ? ' is-on' : ''}`} onClick={(event) => { event.stopPropagation(); onChange(!paid); }}><span/></button>;
}

export default function InvoiceManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [firmId, setFirmId] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [services, setServices] = useState<Service[]>([{ key: crypto.randomUUID(), description: '', amount: '' }]);
  const [lastCreatedId, setLastCreatedId] = useState('');
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedItems, setSelectedItems] = useState<{ description: string; unit_amount_minor: number; quantity: number }[]>([]);
  const [paymentBusyId, setPaymentBusyId] = useState('');
  const toast = useToast();

  const load = useCallback(async () => {
    setReady(false);
    const db = createClient();
    if (!db) { setError('Supabase is not configured. Check the project environment values.'); setReady(true); return; }
    const { data: { user } } = await db.auth.getUser();
    if (!user) { setError('Sign in to view invoices.'); setReady(true); return; }
    const { data: member, error: memberError } = await db.from('firm_members').select('firm_id').eq('user_id', user.id).limit(1).maybeSingle();
    if (memberError || !member) { setError('Your firm workspace could not be found.'); setReady(true); return; }
    setFirmId(member.firm_id);
    const [{ data: firm }, { data: clientRows, error: clientsError }, { data: invoiceRows, error: invoiceError }] = await Promise.all([
      db.from('firms').select('currency').eq('id', member.firm_id).maybeSingle(),
      db.from('clients').select('id,name').eq('firm_id', member.firm_id).order('name'),
      db.from('invoices').select('id,invoice_number,currency,total_minor,due_at,status,client_id,client_snapshot,payment_account_number,payment_bank_name,payment_account_name').eq('firm_id', member.firm_id).order('created_at', { ascending: false }).limit(100),
    ]);
    if (clientsError || invoiceError) { const message = 'Could not load invoices. Please try again.'; setError(message); toast(message, 'error'); }
    else { setError(''); setClients(clientRows ?? []); setInvoices(invoiceRows ?? []); setCurrency((firm?.currency ?? 'NGN').trim()); }
    setReady(true);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const totalMinor = useMemo(() => services.reduce((sum, item) => {
    try { return sum + Number(minorUnits(item.amount || '0')); } catch { return sum; }
  }, 0), [services]);
  const money = useCallback((minor: number, code = currency) => new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(minor / 100), [currency]);

  function updateService(key: string, field: 'description' | 'amount', value: string) {
    setServices((items) => items.map((item) => item.key === key ? { ...item, [field]: value } : item));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (clients.length === 0) throw new Error('Add a client before creating an invoice.');
      const form = new FormData(event.currentTarget);
      const items = services.map((item) => ({ description: item.description.trim(), amount_minor: minorUnits(item.amount) }));
      if (items.some((item) => !item.description)) throw new Error('Add a description for every service.');
      const db = createClient();
      if (!db) throw new Error('Supabase is not configured.');
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error('Please sign in first.');
      const params = {
        p_client_id: String(form.get('client_id') ?? ''),
        p_due_date: String(form.get('due_date') ?? ''),
        p_payment_account_number: String(form.get('payment_account_number') ?? ''),
        p_payment_bank_name: String(form.get('payment_bank_name') ?? ''),
        p_payment_account_name: String(form.get('payment_account_name') ?? ''),
        p_items: items,
        p_actor_user_id: user.id,
      };
      const { data, error: rpcError } = editingInvoice
        ? await db.rpc('update_invoice_with_items', { p_invoice_id: editingInvoice.id, ...params })
        : await db.rpc('create_invoice_with_items', { p_firm_id: firmId, ...params });
      if (rpcError) throw rpcError;
      if (!editingInvoice) setLastCreatedId(data as string);
      toast(editingInvoice ? 'Invoice updated.' : 'Invoice created. Download the PDF when you are ready.', 'success');
      setOpen(false); setServices([{ key: crypto.randomUUID(), description: '', amount: '' }]);
      setEditingInvoice(null);
      await load();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not create the invoice. Please try again.';
      setError(message); toast(message, 'error');
    } finally { setBusy(false); }
  }

  async function edit(invoice: Invoice) {
    if (invoice.status === 'paid' || invoice.status === 'void') return;
    const db = createClient(); if (!db) return;
    const { data: items, error: itemsError } = await db.from('invoice_items').select('description,unit_amount_minor').eq('invoice_id', invoice.id);
    if (itemsError) { setError('Could not load invoice items. Please try again.'); return; }
    setEditingInvoice(invoice);
    setServices((items ?? []).map((item) => ({ key: crypto.randomUUID(), description: item.description, amount: (item.unit_amount_minor / 100).toFixed(2) })));
    setOpen(true); setError('');
  }

  async function view(invoice: Invoice) {
    const db = createClient(); if (!db) return;
    const { data: items, error: itemsError } = await db.from('invoice_items').select('description,unit_amount_minor,quantity').eq('invoice_id', invoice.id);
    if (itemsError) { setError('Could not load invoice details. Please try again.'); return; }
    setSelectedItems(items ?? []); setSelectedInvoice(invoice);
  }

  async function setPaid(invoice: Invoice, isPaid: boolean) {
    setPaymentBusyId(invoice.id);
    try {
      const db = createClient(); if (!db) throw new Error('Supabase is not configured.');
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error('Please sign in first.');
      const status = isPaid ? 'paid' : (invoice.due_at && new Date(invoice.due_at) < new Date() ? 'overdue' : 'issued');
      const { data: updated, error: paymentError } = await db.from('invoices').update({ status, paid_minor: isPaid ? invoice.total_minor : 0, updated_at: new Date().toISOString() }).eq('id', invoice.id).eq('firm_id', firmId).neq('status', 'void').select('id,status').maybeSingle();
      if (paymentError) throw paymentError;
      if (!updated) throw new Error('This invoice could not be updated. It may be void or your account may not have permission.');
      toast(isPaid ? 'Invoice marked as paid.' : 'Invoice marked as unpaid.', 'success');
      if (selectedInvoice?.id === invoice.id) setSelectedInvoice({ ...invoice, status });
      await load();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : typeof cause === 'object' && cause !== null && 'message' in cause ? String(cause.message) : 'Could not update invoice payment status.';
      setError(message); toast(message, 'error');
    } finally { setPaymentBusyId(''); }
  }

  async function remove(invoice: Invoice) {
    if (!window.confirm(`Delete invoice ${invoice.invoice_number}? This cannot be undone.`)) return;
    const db = createClient(); if (!db) return;
    const { data, error: deleteError } = await db.from('invoices').delete().eq('id', invoice.id).eq('firm_id', firmId).select('id');
    if (deleteError) { setError(deleteError.message); toast('Could not delete this invoice.', 'error'); }
    else if (!data?.length) { setError('This invoice could not be deleted. Check your access and try again.'); }
    else { toast('Invoice deleted.', 'success'); if (lastCreatedId === invoice.id) setLastCreatedId(''); await load(); }
  }

  const shown = invoices.filter((invoice) => `${invoice.invoice_number} ${invoice.client_snapshot?.name ?? ''} ${invoice.status}`.toLowerCase().includes(query.toLowerCase()));

  return <motion.main className="app-content" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: 'easeOut' }}>
    <div className="welcome-row"><div><h2>Invoices</h2><p>Create client invoices, track due dates, and download PDFs.</p></div><button className="button button-primary button-small" onClick={() => { setEditingInvoice(null); setServices([{ key: crypto.randomUUID(), description: '', amount: '' }]); setOpen(!open); setError(''); }}><Plus size={14}/>{open ? 'Close' : 'Add invoice'}</button></div>
    {error && <div className="notice-bar" role="alert">{error}</div>}
    {lastCreatedId && <div className="panel" style={{ marginBottom: 15, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><span>Invoice created successfully.</span><a className="button button-primary button-small" href={`/api/invoices/${lastCreatedId}/pdf`}><Download size={14}/>Download PDF</a></div>}
    {open && <Modal title={editingInvoice ? `Edit ${editingInvoice.invoice_number}` : 'Create an invoice'} onClose={() => setOpen(false)}><form key={editingInvoice?.id ?? 'new'} onSubmit={save}>
      {clients.length === 0 ? <div className="notice-bar">Add a client before creating an invoice.</div> : <div className="feature-grid form-grid">
        <label className="field"><span>Client name</span><select name="client_id" required defaultValue={editingInvoice?.client_id ?? ''}><option value="" disabled>Select a client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
        <label className="field"><span>Due date</span><input name="due_date" type="date" required defaultValue={editingInvoice?.due_at?.slice(0, 10) ?? ''} min={editingInvoice ? undefined : new Date().toISOString().slice(0, 10)}/></label>
        <div className="field" style={{ gridColumn: '1 / -1' }}><span>Services rendered</span>
          {services.map((item, index) => <div className="invoice-service-row" key={item.key}>
            <label className="field"><span>Service {index + 1}</span><input value={item.description} onChange={(event) => updateService(item.key, 'description', event.target.value)} placeholder="e.g. Legal consultation" required/></label>
            <label className="field"><span>Amount ({currency})</span><input value={item.amount} onChange={(event) => updateService(item.key, 'amount', event.target.value)} inputMode="decimal" placeholder="0.00" pattern="[0-9]+(\.[0-9]{0,2})?" required/></label>
            {services.length > 1 && <button type="button" className="button button-quiet button-small" aria-label={`Remove service ${index + 1}`} onClick={() => setServices((items) => items.filter((service) => service.key !== item.key))}><Trash2 size={14}/></button>}
          </div>)}
          <button type="button" className="button button-quiet button-small" style={{ marginTop: 8 }} onClick={() => setServices((items) => [...items, { key: crypto.randomUUID(), description: '', amount: '' }])}><Plus size={14}/>Add service</button>
        </div>
        <div className="panel" style={{ gridColumn: '1 / -1', padding: 12, display: 'flex', justifyContent: 'space-between' }}><b>Invoice total</b><b>{money(totalMinor)}</b></div>
        <label className="field"><span>Bank name</span><input name="payment_bank_name" placeholder="Bank name" defaultValue={editingInvoice?.payment_bank_name ?? ''} required/></label>
        <label className="field"><span>Account name</span><input name="payment_account_name" placeholder="Account name" defaultValue={editingInvoice?.payment_account_name ?? ''} required/></label>
        <label className="field"><span>Account number</span><input name="payment_account_number" inputMode="numeric" placeholder="Account number" defaultValue={editingInvoice?.payment_account_number ?? ''} required/></label>
      </div>}
      {clients.length > 0 && <div className="modal-footer"><button type="button" className="button button-quiet button-small" onClick={() => setOpen(false)}>Cancel</button><button className="button button-primary button-small" disabled={busy}>{busy ? <><span className="button-spinner"/> Saving…</> : editingInvoice ? 'Update invoice' : 'Create invoice'}</button></div>}
    </form></Modal>}
    {selectedInvoice && <Modal title={selectedInvoice.invoice_number} onClose={() => setSelectedInvoice(null)}><div className="record-details"><div><span>Client</span><b>{selectedInvoice.client_snapshot?.name || '—'}</b></div><div><span>Due date</span><b>{selectedInvoice.due_at ? new Date(selectedInvoice.due_at).toLocaleDateString() : '—'}</b></div><div><span>Payment status</span><div className="invoice-status-control"><b className="status-pill">{selectedInvoice.status}</b><PaymentSwitch invoice={selectedInvoice} disabled={paymentBusyId === selectedInvoice.id} onChange={(isPaid) => void setPaid(selectedInvoice, isPaid)}/></div></div><div><span>Total</span><b>{money(selectedInvoice.total_minor, selectedInvoice.currency.trim())}</b></div>{selectedInvoice.payment_bank_name && <div><span>Bank</span><b>{selectedInvoice.payment_bank_name}</b></div>}{selectedInvoice.payment_account_name && <div><span>Account name</span><b>{selectedInvoice.payment_account_name}</b></div>}{selectedInvoice.payment_account_number && <div><span>Account number</span><b>{selectedInvoice.payment_account_number}</b></div>}</div><h3 className="detail-section-title">Services</h3><div className="invoice-line-items">{selectedItems.map((item, index) => <div key={`${item.description}-${index}`}><span>{item.description}<small>Qty {item.quantity}</small></span><b>{money(item.unit_amount_minor * item.quantity, selectedInvoice.currency.trim())}</b></div>)}{selectedItems.length === 0 && <p>No line items found.</p>}</div><div className="modal-footer"><a className="button button-quiet button-small" href={`/api/invoices/${selectedInvoice.id}/pdf`}><Download size={14}/>Download PDF</a>{!['paid','void'].includes(selectedInvoice.status) && <button type="button" className="button button-primary button-small" onClick={() => { setSelectedInvoice(null); void edit(selectedInvoice); }}>Edit invoice</button>}</div></Modal>}
    <div className="list-toolbar"><label className="searchbox"><Search size={15}/><input placeholder="Search invoices" value={query} onChange={(event) => setQuery(event.target.value)}/></label></div>
    {!ready ? <div className="list-table loading-table" aria-busy="true" aria-label="Loading invoices"><div className="table-head" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1fr .8fr 50px 120px' }}>{['Invoice','Client','Due date','Total','Status','PDF','Actions'].map((label) => <span key={label}>{label}</span>)}</div>{[1,2,3,4].map((item) => <div className="loading-row" key={item}><span/><span/><span/><span/></div>)}</div> : <div className="list-table"><div className="table-head" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1fr .8fr 50px 120px' }}>{['Invoice','Client','Due date','Total','Status','PDF','Actions'].map((label) => <span key={label}>{label}</span>)}</div>{shown.map((invoice) => <div className="table-row clickable-row" role="button" tabIndex={0} onClick={() => void view(invoice)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void view(invoice); } }} style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1fr .8fr 50px 120px' }} key={invoice.id}><span><b>{invoice.invoice_number}</b></span><span>{invoice.client_snapshot?.name || '—'}</span><span>{invoice.due_at ? new Date(invoice.due_at).toLocaleDateString() : '—'}</span><span>{money(invoice.total_minor, invoice.currency.trim())}</span><span className="invoice-status-control"><b className="status-pill">{invoice.status}</b><PaymentSwitch invoice={invoice} disabled={paymentBusyId === invoice.id} onChange={(isPaid) => void setPaid(invoice, isPaid)}/></span><span><a href={`/api/invoices/${invoice.id}/pdf`} aria-label={`Download ${invoice.invoice_number} PDF`} onClick={(event) => event.stopPropagation()}><Download size={16}/></a></span><span className="row-actions">{!['paid','void'].includes(invoice.status) && <button type="button" aria-label={`Edit ${invoice.invoice_number}`} onClick={(event) => { event.stopPropagation(); void edit(invoice); }}><Pencil size={14}/></button>}<button type="button" aria-label={`Delete ${invoice.invoice_number}`} onClick={(event) => { event.stopPropagation(); void remove(invoice); }}><Trash2 size={14}/></button></span></div>)}{shown.length === 0 && <div className="empty-state" style={{ margin: 15 }}><b>{query ? 'No matching invoices' : 'No invoices yet'}</b>{query ? 'Try another search term.' : 'Create your first invoice to get started.'}</div>}</div>}
  </motion.main>;
}
