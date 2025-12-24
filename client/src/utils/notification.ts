// ============================================
// RICH NOTIFICATION SYSTEM
// Sonner toasts + Sound effects + Action buttons
// ============================================

import { toast } from 'sonner';

type NotificationType = 'info' | 'success' | 'error' | 'warning';

interface NotificationOptions {
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
  sound?: boolean;
}

// ===== SOUND PLAYBACK =====

const playSound = (type: NotificationType) => {
  try {
    let soundFile = '';

    switch (type) {
      case 'success':
        soundFile = '/sounds/success.mp3';
        break;
      case 'error':
        soundFile = '/sounds/error.mp3';
        break;
      case 'info':
        soundFile = '/sounds/info.mp3';
        break;
      case 'warning':
        soundFile = '/sounds/warning.mp3';
        break;
    }

    if (soundFile) {
      const audio = new Audio(soundFile);
      audio.volume = 0.5;
      audio.play().catch((err) => console.error('Sound playback failed:', err));
    }
  } catch (error) {
    console.error('Failed to initialize sound:', error);
  }
};

// ===== NOTIFICATION FUNCTION =====

export const notify = (
  type: NotificationType,
  message: string,
  options: NotificationOptions = {}
) => {
  const {
    description,
    action,
    secondaryAction,
    persistent = false,
    sound = true,
  } = options;

  // Play sound if enabled
  if (sound) {
    playSound(type);
  }

  // Build toast options
  const toastOptions: any = {
    description,
    duration: persistent ? Infinity : type === 'error' ? 6000 : 4000,
  };

  // Add primary action button
  if (action) {
    toastOptions.action = {
      label: action.label,
      onClick: action.onClick,
    };
  }

  // Add secondary action (cancel button for persistent toasts)
  if (secondaryAction) {
    toastOptions.cancel = {
      label: secondaryAction.label,
      onClick: secondaryAction.onClick,
    };
  }

  // Trigger appropriate toast type
  switch (type) {
    case 'success':
      return toast.success(message, toastOptions);
    case 'error':
      return toast.error(message, toastOptions);
    case 'warning':
      return toast.warning(message, toastOptions);
    case 'info':
    default:
      return toast.info(message, toastOptions);
  }
};

// ===== CONVENIENCE FUNCTIONS =====

export const notifySuccess = (message: string, options?: NotificationOptions) =>
  notify('success', message, options);

export const notifyError = (message: string, options?: NotificationOptions) =>
  notify('error', message, { ...options, persistent: options?.persistent ?? true });

export const notifyInfo = (message: string, options?: NotificationOptions) =>
  notify('info', message, options);

export const notifyWarning = (message: string, options?: NotificationOptions) =>
  notify('warning', message, options);

// ===== SPECIALIZED NOTIFICATIONS =====

/**
 * Notify when item is added to cart with Undo action
 */
export const notifyItemAdded = (
  productName: string,
  price: number,
  onUndo: () => void
) => {
  return notifyInfo(`${productName} added to cart`, {
    description: `KES ${price.toLocaleString()}`,
    action: {
      label: 'Undo',
      onClick: onUndo,
    },
  });
};

/**
 * Notify sale completion with Print & New Sale actions
 */
export const notifySaleComplete = (
  receiptNumber: string,
  total: number,
  onPrintReceipt: () => void,
  onNewSale: () => void
) => {
  return notifySuccess('Transaction Successful!', {
    description: `Receipt #${receiptNumber} - KES ${total.toLocaleString()}`,
    action: {
      label: 'Print Receipt',
      onClick: onPrintReceipt,
    },
    secondaryAction: {
      label: 'New Sale',
      onClick: onNewSale,
    },
  });
};

/**
 * Notify stock error (persistent)
 */
export const notifyStockError = (message: string) => {
  return notifyError(message, {
    description: 'Please adjust quantity or check inventory',
    persistent: true,
  });
};

/**
 * Notify API failure (persistent)
 */
export const notifyApiError = (message: string, description?: string) => {
  return notifyError(message, {
    description: description || 'Please try again or contact support',
    persistent: true,
  });
};
