'use client';

import { useEffect, useState } from 'react';
import Toast, { ToastProps } from './Toast';
import { toastEmitter } from '@/lib/toast';

type ToastData = Omit<ToastProps, 'onClose'>;

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const handleToast = (toast: ToastData) => {
      setToasts((prev) => [...prev, toast]);
    };

    toastEmitter.on('toast', handleToast);

    return () => {
      toastEmitter.off('toast', handleToast);
    };
  }, []);

  const handleClose = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={handleClose} />
      ))}
    </div>
  );
}
