'use client';

import { toast as sonnerToast, type ExternalToast } from 'sonner';

interface CrossyToastOptions extends ExternalToast {
  variant?: 'success' | 'error' | 'info' | 'warning';
}

export const crossyToast = {
  success: (message: string, options?: CrossyToastOptions) => {
    return sonnerToast.success(message, {
      ...options,
      className: 'crossy-card border-2 border-crossy-green',
      style: {
        background: 'white',
        color: '#2A1E5C',
        borderRadius: '18px',
      },
    });
  },
  error: (message: string, options?: CrossyToastOptions) => {
    return sonnerToast.error(message, {
      ...options,
      className: 'crossy-card border-2 border-crossy-red',
      style: {
        background: 'white',
        color: '#2A1E5C',
        borderRadius: '18px',
      },
    });
  },
  info: (message: string, options?: CrossyToastOptions) => {
    return sonnerToast.info(message, {
      ...options,
      className: 'crossy-card border-2 border-crossy-purple',
      style: {
        background: 'white',
        color: '#2A1E5C',
        borderRadius: '18px',
      },
    });
  },
  warning: (message: string, options?: CrossyToastOptions) => {
    return sonnerToast.warning(message, {
      ...options,
      className: 'crossy-card border-2 border-crossy-orange',
      style: {
        background: 'white',
        color: '#2A1E5C',
        borderRadius: '18px',
      },
    });
  },
};
