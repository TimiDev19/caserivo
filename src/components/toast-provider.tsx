'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
type ToastMessage = { id: number; message: string; kind: ToastKind };
type ToastFn = (message: string, kind?: ToastKind) => void;
const ToastContext = createContext<ToastFn>(() => undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastMessage[]>([]);
  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const toast = useCallback<ToastFn>((message, kind = 'info') => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, message, kind }]);
    window.setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);
  return <ToastContext.Provider value={toast}>
    {children}
    <div className="toast-stack" aria-label="Notifications">
      {items.map((item) => <div className={`toast toast-${item.kind}`} key={item.id} role={item.kind === 'error' ? 'alert' : 'status'}>
        {item.kind === 'success' ? <CheckCircle2 size={18}/> : item.kind === 'error' ? <CircleAlert size={18}/> : <Info size={18}/>}
        <span>{item.message}</span>
        <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(item.id)}><X size={15}/></button>
      </div>)}
    </div>
  </ToastContext.Provider>;
}

export function useToast() { return useContext(ToastContext); }
