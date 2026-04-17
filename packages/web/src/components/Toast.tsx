import { useEffect, useState } from 'react';

interface ToastItem {
  id: number;
  message: string;
}

let nextId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function addToast(message: string) {
    const id = nextId++;
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }

  return { toasts, addToast };
}

export function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed right-4 z-[100] flex flex-col gap-2" style={{ top: 'calc(var(--chrome-height) + 1rem)' }}>
      {toasts.map(t => (
        <div key={t.id} className="bg-red-800 border border-red-500 text-white font-mono text-sm px-4 py-2 animate-fade-in max-w-sm">
          {t.message}
        </div>
      ))}
    </div>
  );
}
