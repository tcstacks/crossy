import { ToastType } from '@/components/Toast';

type ToastListener = (toast: {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}) => void;

class ToastEmitter {
  private listeners: ToastListener[] = [];

  on(event: 'toast', listener: ToastListener) {
    this.listeners.push(listener);
  }

  off(event: 'toast', listener: ToastListener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  emit(event: 'toast', data: Parameters<ToastListener>[0]) {
    this.listeners.forEach((listener) => listener(data));
  }
}

export const toastEmitter = new ToastEmitter();

let toastCounter = 0;

export const toast = {
  success: (message: string, duration?: number) => {
    toastEmitter.emit('toast', {
      id: `toast-${++toastCounter}`,
      type: 'success',
      message,
      duration,
    });
  },

  error: (message: string, duration?: number) => {
    toastEmitter.emit('toast', {
      id: `toast-${++toastCounter}`,
      type: 'error',
      message,
      duration,
    });
  },

  info: (message: string, duration?: number) => {
    toastEmitter.emit('toast', {
      id: `toast-${++toastCounter}`,
      type: 'info',
      message,
      duration,
    });
  },

  warning: (message: string, duration?: number) => {
    toastEmitter.emit('toast', {
      id: `toast-${++toastCounter}`,
      type: 'warning',
      message,
      duration,
    });
  },
};
