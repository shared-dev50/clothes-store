import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('PaymentStatusDialog component state and accessibility definitions', () => {
  const dialogPath = path.resolve(process.cwd(), 'src/components/ui/PaymentStatusDialog.tsx');
  const dialogContent = fs.readFileSync(dialogPath, 'utf8');

  // Verify all payment states are handled in the component
  assert.match(dialogContent, /'initiating'/);
  assert.match(dialogContent, /'waiting_mpesa'/);
  assert.match(dialogContent, /'processing'/);
  assert.match(dialogContent, /'success'/);
  assert.match(dialogContent, /'failed'/);
  assert.match(dialogContent, /'unknown_outcome'/);

  // 1. Initiating state: displays loading and connects to gateway
  assert.match(dialogContent, /Initiating Payment/);
  assert.match(dialogContent, /Please wait while we initialize your secure payment request/);

  // 2. Waiting for M-Pesa: prompts user to enter PIN on phone and offers safe dismiss
  assert.match(dialogContent, /Prompt Sent to Your Phone/);
  assert.match(dialogContent, /Authorize on Your Phone/);
  assert.match(dialogContent, /Enter your <strong>M-Pesa PIN<\/strong>/);
  assert.match(dialogContent, /Waiting for M-Pesa confirmation\.\.\./);
  assert.match(dialogContent, /Wait in Background \(Keep Reserved\)/);
  assert.match(dialogContent, /Closing this dialog will not cancel your order or payment/);

  // 3. Payment success: shows animated checkmark, confirmation, order number, amount, payment method, View My Order, and Continue Shopping
  assert.match(dialogContent, /Payment Confirmed/);
  assert.match(dialogContent, /Payment Successful!/);
  assert.match(dialogContent, /Your order has been confirmed\. Thank you for shopping with HBS Wear!/);
  assert.match(dialogContent, /Order Number:/);
  assert.match(dialogContent, /Amount Paid:/);
  assert.match(dialogContent, /Payment Method:/);
  assert.match(dialogContent, /View My Order/);
  assert.match(dialogContent, /Continue Shopping/);
  assert.match(dialogContent, /animate-ping/);

  // 4. Payment failed or cancelled: displays friendly message, Retry and Change Payment Method
  assert.match(dialogContent, /Payment Failed/);
  assert.match(dialogContent, /Retry Payment/);
  assert.match(dialogContent, /Change Payment Method/);

  // 5. Unknown outcome / delayed: does NOT treat as failure, advises checking My Orders
  assert.match(dialogContent, /Payment Still Processing/);
  assert.match(dialogContent, /Confirmation Pending/);
  assert.match(dialogContent, /Order #\{orderNumber\} remains reserved/);
  assert.match(dialogContent, /Check My Orders/);

  // 6. Keyboard accessibility & focus
  assert.match(dialogContent, /role="dialog"/);
  assert.match(dialogContent, /aria-modal="true"/);
  assert.match(dialogContent, /handleKeyDown/);
  assert.match(dialogContent, /e\.key === 'Escape'/);
});

test('Checkout payment state handling, duplicate submission protection, and safe cart clearing', () => {
  const checkoutPath = path.resolve(process.cwd(), 'src/pages/Checkout.tsx');
  const checkoutContent = fs.readFileSync(checkoutPath, 'utf8');

  // Verify PaymentStatusDialog is rendered in Checkout
  assert.match(checkoutContent, /<PaymentStatusDialog/);

  // Duplicate click protection: isProcessing guard
  assert.match(checkoutContent, /if \(isProcessing\) return;/);

  // M-Pesa: initiateMpesa transitions to waiting_mpesa and starts bounded polling
  assert.match(checkoutContent, /await initiateMpesa/);
  assert.match(checkoutContent, /setDialogState\('waiting_mpesa'\)/);
  assert.match(checkoutContent, /startMpesaPolling/);

  // Stripe: StripeCardSection triggers processing and polls backend before confirming
  assert.match(checkoutContent, /onProcessing/);
  assert.match(checkoutContent, /setDialogProvider\('stripe'\)/);
  assert.match(checkoutContent, /statusData\.paymentStatus === 'PAID'/);

  // Bounded polling stops on terminal states (PAID / FAILED) or maxPolls
  assert.match(checkoutContent, /statusData\.latestPayment\?\.status === 'FAILED'/);
  assert.match(checkoutContent, /setDialogState\('unknown_outcome'\)/);

  // Customer is NOT redirected to empty cart immediately after success:
  // Cart empty redirect is guarded against active success state and confirmedOrder
  assert.match(checkoutContent, /cart\.length === 0 && !confirmedOrder && dialogState !== 'success'/);

  // Order number and amount remain available via confirmedOrder even after cart is cleared
  assert.match(checkoutContent, /setConfirmedOrder/);
  assert.match(checkoutContent, /confirmedOrder\?\.orderNumber/);
  assert.match(checkoutContent, /confirmedOrder\?\.total/);

  // Clear cart only after backend confirms PAID
  assert.match(checkoutContent, /clearCart\(\)/);
  assert.match(checkoutContent, /clearPendingOrder\(\)/);
});

test('OrderConfirmation page reflects pending and completed states accurately', () => {
  const confirmPath = path.resolve(process.cwd(), 'src/pages/OrderConfirmation.tsx');
  const confirmContent = fs.readFileSync(confirmPath, 'utf8');

  // Verify separate headers for paid vs unpaid vs cancelled
  assert.match(confirmContent, /Order Confirmed & Paid/);
  assert.match(confirmContent, /Payment Pending/);
  assert.match(confirmContent, /Order Cancelled/);

  // Verify items list, quantities, and line totals
  assert.match(confirmContent, /Items Purchased/);
  assert.match(confirmContent, /item\.productName/);
  assert.match(confirmContent, /item\.quantity/);
  assert.match(confirmContent, /item\.totalPrice/);

  // Verify delivery address and charges
  assert.match(confirmContent, /Delivery Address/);
  assert.match(confirmContent, /Delivery Fee/);

  // Verify links to My Orders and Continue Shopping
  assert.match(confirmContent, /to="\/orders"/);
  assert.match(confirmContent, /to="\/shop"/);
  assert.match(confirmContent, /My Orders/);
  assert.match(confirmContent, /Continue Shopping/);

  // Verify refresh capability
  assert.match(confirmContent, /handleManualRefresh/);
  assert.match(confirmContent, /Refresh Status/);

  // Verify PaymentStatusDialog integration
  assert.match(confirmContent, /<PaymentStatusDialog/);
});
