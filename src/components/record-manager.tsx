'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/components/toast-provider';
import Modal from '@/components/modal';
import { motion } from 'framer-motion';

type Config = { title: string; table: string; fields: { name: string; label: string; type?: string; required?: boolean; options?: { value: string; label: string }[] }[]; columns: { key: string; label: string }[]; filters?: Record<string, string> };
function localDateTime(value: string) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
export default function RecordManager({ config }: { config: Config }) {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [selected, setSelected] = useState<Record<string, any> | null>(null);
  const [clientOptions, setClientOptions] = useState<{ id: string; name: string }[]>([]);
  const path = usePathname();
  const toast = useToast();

  const load = useCallback(async () => {
    setReady(false);
    const db = createClient();
    if (!db) { const message = 'Supabase is not configured. Check the project environment values.'; setError(message); toast(message, 'error'); setReady(true); return; }
    const { data: { user } } = await db.auth.getUser();
    if (!user) { const message = 'Sign in to view firm records.'; setError(message); setReady(true); return; }
    let clients: { id: string; name: string }[] = [];
    if (config.fields.some((field) => field.type === 'client-select') || config.table === 'cases') {
      const { data: membership, error: membershipError } = await db.from('firm_members').select('firm_id').eq('user_id', user.id).limit(1).maybeSingle();
      if (membershipError || !membership) { setError('Your firm workspace could not be found.'); setReady(true); return; }
      const { data: clientRows, error: clientError } = await db.from('clients').select('id,name').eq('firm_id', membership.firm_id).order('name');
      if (clientError) { setError('Could not load the client list. Please try again.'); setReady(true); return; }
      clients = clientRows ?? [];
      setClientOptions(clients);
    }
    let request = db.from(config.table).select('*').order('created_at', { ascending: false }).limit(100);
    for (const [key, value] of Object.entries(config.filters ?? {})) request = request.eq(key, value);
    const { data, error: requestError } = await request;
    if (requestError) { setError(requestError.message); toast('Could not load records. Please try again.', 'error'); }
    else { setError(''); setRows((data ?? []).map((row) => ({ ...row, ...(row.client_id ? { client_name: clients.find((client) => client.id === row.client_id)?.name ?? 'Client unavailable' } : {}) }))); }
    setReady(true);
  }, [config.fields, config.filters, config.table, toast]);

  useEffect(() => { void load(); }, [load, path]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(''); setBusy(true);
    try {
      const db = createClient();
      if (!db) throw new Error('Supabase is not configured.');
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error('Please sign in first.');
      const { data: member } = await db.from('firm_members').select('firm_id').eq('user_id', user.id).limit(1).maybeSingle();
      if (!member) throw new Error('Your firm workspace could not be found.');
      const payload: Record<string, any> = editing ? {} : { firm_id: member.firm_id, created_by: user.id };
      for (const field of config.fields) {
        const value = form.get(field.name);
        if (field.type === 'client-select' && editing) {
          payload[field.name] = value || null;
          continue;
        }
        if (field.name === 'starts_at' && value) payload[field.name] = new Date(String(value)).toISOString();
        else if (value !== null && value !== '') payload[field.name] = value;
      }
      // Avoid sending closed_at for ordinary active cases. Some deployed databases
      // may not yet have the optional case close-date migration applied.
      if (config.table === 'cases' && payload.status === 'closed') {
        payload.closed_at = editing?.closed_at ?? new Date().toISOString();
      }
      if (config.table === 'cases' && !payload.reference) payload.reference = `CASE-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const { data: savedRows, error: saveError } = editing
        ? await db.from(config.table).update(payload).eq('id', editing.id).eq('firm_id', member.firm_id).select('id')
        : await db.from(config.table).insert(payload).select('id');
      if (saveError) throw saveError;
      if (editing && (!savedRows || savedRows.length === 0)) throw new Error('This case was not updated. Check your access and try again.');
      setOpen(false); setEditing(null);
      toast(`${config.title.slice(0, -1)} ${editing ? 'updated' : 'saved'}.`, 'success');
      await load();
    } catch (cause) {
      const message = cause instanceof Error
        ? cause.message
        : typeof cause === 'object' && cause !== null && 'message' in cause
          ? String((cause as { message: unknown }).message)
          : 'Could not save this record. Please try again.';
      setError(message); toast(message, 'error');
    } finally { setBusy(false); }
  }

  async function remove(row: Record<string, any>) {
    if (!window.confirm(`Delete “${row.title ?? row.id}”? This cannot be undone.`)) return;
    const db = createClient(); if (!db) return;
    const { data, error: deleteError } = await db.from(config.table).delete().eq('id', row.id).select('id');
    if (deleteError) { setError(deleteError.message); toast('Could not delete this record.', 'error'); }
    else if (!data?.length) { const message = `This ${config.title.slice(0, -1).toLowerCase()} could not be deleted. Check your access and try again.`; setError(message); toast(message, 'error'); }
    else { toast('Record deleted.', 'success'); await load(); }
  }

  const shown = rows.filter((row) => Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(query.toLowerCase())));
  const detailEntries = selected ? Object.entries(selected).filter(([key]) => !['id', 'firm_id', 'created_by', 'updated_at'].includes(key) && !key.endsWith('_id')).map(([key, value]) => {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
    const display = key.endsWith('_at') && value ? new Date(String(value)).toLocaleString() : value == null || value === '' ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    return { key, label, display };
  }) : [];
  return <motion.main className="app-content" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: 'easeOut' }}>
    <div className="welcome-row"><div><h2>{config.title}</h2><p>Manage and find your firm’s {config.title.toLowerCase()}.</p></div><button className="button button-primary button-small" onClick={() => { setEditing(null); setOpen(!open); }}><Plus size={14}/>{open ? 'Close' : `Add ${config.title.slice(0, -1)}`}</button></div>
    {error && <div className="notice-bar" role="alert">{error}</div>}
    {open && <Modal title={editing ? `Edit ${config.title.slice(0, -1).toLowerCase()}` : `Create ${config.title.slice(0, -1).toLowerCase()}`} onClose={() => setOpen(false)}><form key={editing?.id ?? 'new'} onSubmit={save}><div className="feature-grid form-grid">{config.fields.map((field) => <label className="field" key={field.name}><span>{field.label}</span>{field.type === 'client-select' ? <select name={field.name} required={field.required !== false} defaultValue={editing?.[field.name] ?? ''}><option value="">{field.required === false ? 'No client' : 'Select a client'}</option>{clientOptions.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select> : field.type === 'select' ? <select name={field.name} defaultValue={editing?.[field.name] ?? field.options?.[0]?.value ?? 'active'}>{(field.options ?? [{ value: 'active', label: 'Active' }, { value: 'closed', label: 'Closed' }, { value: 'archived', label: 'Archived' }]).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === 'textarea' ? <textarea name={field.name} required={field.required !== false} placeholder={field.label} rows={4} defaultValue={editing?.[field.name] ?? ''}/> : <input name={field.name} type={field.type ?? 'text'} required={field.required !== false} placeholder={field.label} defaultValue={field.name === 'starts_at' && editing?.[field.name] ? localDateTime(editing[field.name]) : editing?.[field.name] ?? ''}/>}</label>)}</div><div className="modal-footer"><button type="button" className="button button-quiet button-small" onClick={() => setOpen(false)}>Cancel</button><button className="button button-primary button-small" disabled={busy}>{busy ? <><span className="button-spinner"/> Saving…</> : editing ? `Update ${config.title.slice(0, -1).toLowerCase()}` : `Save ${config.title.slice(0, -1).toLowerCase()}`}</button></div></form></Modal>}
    {selected && <Modal title={selected.title || selected.name || selected.reference || config.title.slice(0, -1)} onClose={() => setSelected(null)}><div className="record-details">{detailEntries.map((entry) => <div key={entry.key}><span>{entry.label}</span><b>{entry.display}</b></div>)}</div></Modal>}
    <div className="list-toolbar"><label className="searchbox"><Search size={15}/><input placeholder={`Search ${config.title.toLowerCase()}`} value={query} onChange={(event) => setQuery(event.target.value)}/></label></div>
    {!ready ? <div className="list-table loading-table" aria-busy="true" aria-label={`Loading ${config.title.toLowerCase()}`}><div className="table-head" style={{ gridTemplateColumns: `repeat(${config.columns.length}, minmax(100px, 1fr)) 80px` }}>{config.columns.map((column) => <span key={column.key}>{column.label}</span>)}<span>Actions</span></div>{[1,2,3,4].map((item) => <div className="loading-row" key={item}><span/><span/><span/><span/></div>)}</div> : <div className="list-table"><div className="table-head" style={{ gridTemplateColumns: `repeat(${config.columns.length}, minmax(100px, 1fr)) 80px` }}>{config.columns.map((column) => <span key={column.key}>{column.label}</span>)}<span>Actions</span></div>{shown.map((row, index) => <div className="table-row clickable-row" role="button" tabIndex={0} onClick={() => setSelected(row)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(row); } }} style={{ gridTemplateColumns: `repeat(${config.columns.length}, minmax(100px, 1fr)) 80px` }} key={row.id ?? index}>{config.columns.map((column, columnIndex) => { const value = row[column.key]; const display = column.key.endsWith('_at') && value ? new Date(value).toLocaleDateString() : value || '—'; return <span key={column.key}>{columnIndex === 0 ? <b>{display}</b> : display}</span>; })}<span className="row-actions"><button type="button" aria-label={`Edit ${config.title.slice(0, -1).toLowerCase()}`} onClick={(event) => { event.stopPropagation(); setEditing(row); setOpen(true); }}><Pencil size={14}/></button><button type="button" aria-label={`Delete ${config.title.slice(0, -1).toLowerCase()}`} onClick={(event) => { event.stopPropagation(); void remove(row); }}><Trash2 size={14}/></button></span></div>)}{shown.length === 0 && <div className="empty-state" style={{ margin: 15 }}><b>{query ? 'No matching records' : `No ${config.title.toLowerCase()} yet`}</b>{query ? 'Try another search term.' : 'Add your first record to get started.'}</div>}</div>}
  </motion.main>;
}
