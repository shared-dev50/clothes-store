import React, { useEffect, useRef } from 'react';
import {
  Smartphone,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  X,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';

export type PaymentDialogState =
  | 'idle'
  | 'initiating'
  | 'waiting_mpesa'
  | 'processing'
  | 'success'
  | 'failed'
  | 'unknown_outcome';

export interface PaymentStatusDialogProps {
  isOpen: boolean;
  state: PaymentDialogState;
  provider?: 'mpesa' | 'stripe';
  orderNumber?: string;
  amount?: number;
  phoneNumber?: string;
  errorMessage?: string;
  paymentMethodLabel?: string;
  onClose: () => void;
  onViewOrder?: () => void;
  onContinueShopping?: () => void;
  onRetry?: () => void;
  onCheckMyOrders?: () => void;
}

export const PaymentStatusDialog: React.FC<PaymentStatusDialogProps> = ({
  isOpen,
  state,
  provider = 'mpesa',
  orderNumber,
  amount,
  phoneNumber,
  errorMessage,
  paymentMethodLabel,
  onClose,
  onViewOrder,
  onContinueShopping,
  onRetry,
  onCheckMyOrders,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  // Keyboard accessibility: handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Do not allow accidental close while initiating
        if (state !== 'initiating') {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, state, onClose]);

  // Focus management: focus primary action button when state changes
  useEffect(() => {
    if (isOpen && primaryButtonRef.current) {
      primaryButtonRef.current.focus();
    }
  }, [isOpen, state]);

  if (!isOpen || state === 'idle') {
    return null;
  }

  const isDismissable = state !== 'initiating';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && isDismissable) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md bg-brand-white text-brand-black border border-brand-stone/40 shadow-2xl p-6 sm:p-8 relative animate-in zoom-in-95 duration-200"
      >
        {/* Close Button (visible when dismissable) */}
        {isDismissable && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-4 right-4 p-1.5 text-brand-taupe hover:text-brand-black hover:bg-brand-stone/20 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-brand-black"
          >
            <X size={18} />
          </button>
        )}

        {/* 1. Initiating Payment State */}
        {state === 'initiating' && (
          <div className="text-center py-4">
            <div className="w-14 h-14 border-3 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mb-5" />
            <span className="inline-block px-3 py-1 bg-brand-stone/20 text-brand-black text-[11px] font-bold uppercase tracking-widest rounded-full mb-3">
              Initiating Payment
            </span>
            <h3 id="payment-dialog-title" className="text-xl font-display uppercase tracking-widest mb-3">
              {provider === 'mpesa' ? 'Preparing M-Pesa Request' : 'Connecting to Card Gateway'}
            </h3>
            <p className="text-sm text-brand-taupe leading-relaxed max-w-sm mx-auto mb-6">
              Please wait while we initialize your secure payment request. Do not close or refresh this page.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-brand-taupe">
              <ShieldCheck size={16} className="text-brand-taupe" />
              <span>256-bit SSL encrypted transaction</span>
            </div>
          </div>
        )}

        {/* 2. Waiting for M-Pesa Payment State */}
        {state === 'waiting_mpesa' && (
          <div className="text-center py-2">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-[#4CAF50] rounded-full flex items-center justify-center mx-auto mb-4 relative shadow-xs">
              <Smartphone size={32} />
              <span className="absolute -inset-1 rounded-full border border-emerald-400 animate-ping opacity-25" />
            </div>

            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold uppercase tracking-widest rounded-full mb-3">
              Prompt Sent to Your Phone
            </span>

            <h3 id="payment-dialog-title" className="text-xl font-display uppercase tracking-widest mb-2">
              Authorize on Your Phone
            </h3>

            <p className="text-sm text-brand-taupe leading-relaxed mb-5">
              An M-Pesa prompt for{' '}
              <strong className="text-brand-black">KES {amount ? amount.toLocaleString() : ''}</strong>{' '}
              was sent to <strong className="text-brand-black">{phoneNumber || 'your phone'}</strong>.
            </p>

            {/* Step-by-step instructions box */}
            <div className="bg-brand-stone/10 border border-brand-stone/30 p-4 text-left rounded-xs mb-5 text-xs text-brand-black space-y-2">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 bg-brand-black text-brand-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  1
                </span>
                <span>Check your phone screen for the Safaricom M-Pesa notification prompt.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 bg-brand-black text-brand-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  2
                </span>
                <span>Enter your <strong>M-Pesa PIN</strong> to authorize the payment.</span>
              </div>
            </div>

            {/* Waiting indicator */}
            <div className="flex items-center justify-center gap-2 py-2 mb-6 text-xs text-emerald-700 bg-emerald-50/60 border border-emerald-200/50 rounded-xs">
              <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span>Waiting for M-Pesa confirmation...</span>
            </div>

            {/* Safe dismiss action */}
            <button
              ref={primaryButtonRef}
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-brand-stone/20 hover:bg-brand-stone/30 text-brand-black text-xs font-semibold uppercase tracking-widest transition-colors"
            >
              Wait in Background (Keep Reserved)
            </button>
            <p className="text-[11px] text-brand-taupe mt-2">
              Closing this dialog will not cancel your order or payment.
            </p>
          </div>
        )}

        {/* 3. Processing State (Card / General) */}
        {state === 'processing' && (
          <div className="text-center py-4">
            <div className="w-14 h-14 border-3 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mb-5" />
            <span className="inline-block px-3 py-1 bg-brand-stone/20 text-brand-black text-[11px] font-bold uppercase tracking-widest rounded-full mb-3">
              Verifying Payment
            </span>
            <h3 id="payment-dialog-title" className="text-xl font-display uppercase tracking-widest mb-3">
              Processing Payment
            </h3>
            <p className="text-sm text-brand-taupe leading-relaxed max-w-sm mx-auto mb-6">
              Confirming transaction with the payment gateway... This usually takes only a few seconds.
            </p>
          </div>
        )}

        {/* 4. Payment Successful State */}
        {state === 'success' && (
          <div className="text-center py-2">
            {/* Animated success checkmark consistent with M-Pesa ping effect */}
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 relative shadow-xs">
              <CheckCircle2 size={36} className="text-emerald-600 animate-in zoom-in-75 duration-300" />
              <span className="absolute -inset-1 rounded-full border border-emerald-400 animate-ping opacity-25" />
            </div>

            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold uppercase tracking-widest rounded-full mb-3">
              Payment Confirmed
            </span>

            <h3 id="payment-dialog-title" className="text-2xl font-display uppercase tracking-widest mb-2 text-brand-black">
              Payment Successful!
            </h3>

            <p className="text-sm text-brand-taupe mb-5 leading-relaxed max-w-sm mx-auto">
              Your order has been confirmed. Thank you for shopping with HBS Wear!
            </p>

            {/* Confirmed Order Summary Box */}
            <div className="bg-brand-stone/10 border border-brand-stone/30 p-4 text-left rounded-xs mb-6 text-xs text-brand-black space-y-2.5">
              {orderNumber && (
                <div className="flex justify-between items-center">
                  <span className="text-brand-taupe uppercase tracking-wider font-medium">Order Number:</span>
                  <span className="font-semibold text-brand-black font-mono">#{orderNumber}</span>
                </div>
              )}
              {typeof amount === 'number' && amount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-brand-taupe uppercase tracking-wider font-medium">Amount Paid:</span>
                  <span className="font-bold text-brand-black">KES {amount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-brand-taupe uppercase tracking-wider font-medium">Payment Method:</span>
                <span className="font-medium text-brand-black flex items-center gap-1.5">
                  {paymentMethodLabel ? (
                    <span>{paymentMethodLabel}</span>
                  ) : provider === 'mpesa' ? (
                    <>
                      <Smartphone size={13} className="text-[#4CAF50]" />
                      <span>M-Pesa</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={13} className="text-[#635BFF]" />
                      <span>Credit / Debit Card (Stripe)</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                ref={primaryButtonRef}
                type="button"
                onClick={onViewOrder || onClose}
                className="w-full py-3.5 bg-brand-black text-brand-white text-xs font-semibold uppercase tracking-widest hover:bg-brand-black/90 transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                View My Order <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={onContinueShopping || onClose}
                className="w-full py-3 bg-brand-white text-brand-black border border-brand-stone text-xs font-semibold uppercase tracking-widest hover:bg-brand-stone/10 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}

        {/* 5. Payment Failed or Cancelled State */}
        {state === 'failed' && (
          <div className="text-center py-3">
            <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xs">
              <XCircle size={36} />
            </div>

            <span className="inline-block px-3 py-1 bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold uppercase tracking-widest rounded-full mb-3">
              Payment Incomplete
            </span>

            <h3 id="payment-dialog-title" className="text-2xl font-display uppercase tracking-widest mb-2 text-rose-900">
              Payment Failed
            </h3>

            <p className="text-sm text-rose-700 bg-rose-50/60 border border-rose-200 p-3 rounded-xs mb-5 leading-relaxed">
              {errorMessage || 'The payment request was cancelled, declined, or timed out. No funds were charged to your account.'}
            </p>

            <p className="text-xs text-brand-taupe mb-6">
              Your items remain reserved. You can retry with M-Pesa or switch to card checkout.
            </p>

            <div className="space-y-2.5">
              {onRetry && (
                <button
                  ref={primaryButtonRef}
                  type="button"
                  onClick={onRetry}
                  className="w-full py-3.5 bg-brand-black text-brand-white text-xs font-semibold uppercase tracking-widest hover:bg-brand-black/90 transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <RefreshCw size={14} /> Retry Payment
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-brand-white text-brand-black border border-brand-stone text-xs font-semibold uppercase tracking-widest hover:bg-brand-stone/10 transition-colors"
              >
                Change Payment Method
              </button>
            </div>
          </div>
        )}

        {/* 6. Still Processing / Unknown Outcome State */}
        {state === 'unknown_outcome' && (
          <div className="text-center py-3">
            <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xs">
              <Clock size={36} />
            </div>

            <span className="inline-block px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold uppercase tracking-widest rounded-full mb-3">
              Confirmation Pending
            </span>

            <h3 id="payment-dialog-title" className="text-xl font-display uppercase tracking-widest mb-2 text-amber-950">
              Payment Still Processing
            </h3>

            <p className="text-sm text-brand-taupe mb-4 leading-relaxed">
              We have not received final confirmation from {provider === 'mpesa' ? 'M-Pesa' : 'the payment provider'} yet.
              Network delays occasionally cause confirmations to take a few extra minutes.
            </p>

            <div className="bg-amber-50/60 border border-amber-200 p-3 rounded-xs text-xs text-amber-900 text-left mb-6 leading-relaxed">
              <strong>Order #{orderNumber} remains reserved.</strong> If funds were deducted from your account, your order will update to Paid automatically once the network delivers the callback.
            </div>

            <div className="space-y-2.5">
              <button
                ref={primaryButtonRef}
                type="button"
                onClick={onViewOrder || onClose}
                className="w-full py-3.5 bg-brand-black text-brand-white text-xs font-semibold uppercase tracking-widest hover:bg-brand-black/90 transition-colors flex items-center justify-center gap-2"
              >
                View Order Status <ArrowRight size={14} />
              </button>
              {onCheckMyOrders && (
                <button
                  type="button"
                  onClick={onCheckMyOrders}
                  className="w-full py-3 bg-brand-white text-brand-black border border-brand-stone text-xs font-semibold uppercase tracking-widest hover:bg-brand-stone/10 transition-colors"
                >
                  Check My Orders
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
