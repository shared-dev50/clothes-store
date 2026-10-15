import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  XCircle,
  ChevronRight,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getMyOrders, type CustomerOrder } from '../services/orderApi';

const getOrderStatusBadge = (status: CustomerOrder['status']) => {
  switch (status) {
    case 'DELIVERED':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={13} className="text-emerald-600" /> Delivered
        </span>
      );
    case 'SHIPPED':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-blue-50 text-blue-800 border border-blue-200">
          <Truck size={13} className="text-blue-600" /> Shipped
        </span>
      );
    case 'PROCESSING':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
          <Package size={13} className="text-indigo-600" /> Processing
        </span>
      );
    case 'PENDING_PAYMENT':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-amber-50 text-amber-800 border border-amber-200">
          <Clock size={13} className="text-amber-600" /> Pending Payment
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
          <XCircle size={13} className="text-zinc-500" /> Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-zinc-100 text-zinc-700">
          {status}
        </span>
      );
  }
};

const getPaymentStatusBadge = (status: CustomerOrder['paymentStatus']) => {
  switch (status) {
    case 'PAID':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
          Paid
        </span>
      );
    case 'UNPAID':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-amber-50 text-amber-800 border border-amber-200">
          Unpaid
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-rose-50 text-rose-800 border border-rose-200">
          Failed
        </span>
      );
    case 'REFUNDED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-purple-50 text-purple-800 border border-purple-200">
          Refunded
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-zinc-100 text-zinc-700">
          {status}
        </span>
      );
  }
};

const formatDate = (dateString: string) => {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const MyOrders: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, isInitializing, user } = useAuthStore();

  const {
    data: orders,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['my-orders'],
    queryFn: getMyOrders,
    enabled: isAuthenticated(),
  });

  // 1. Session initialization check
  if (isInitializing) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-28 text-center">
        <div className="w-8 h-8 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs uppercase tracking-widest text-brand-taupe font-semibold">
          Verifying session...
        </p>
      </div>
    );
  }

  // 2. Route protection for unauthenticated users
  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
      {/* Page Header */}
      <div className="border-b border-brand-stone/40 pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display uppercase tracking-widest text-brand-black mb-2">
            My Orders
          </h1>
          <p className="text-brand-taupe text-sm">
            Order history and delivery status for <span className="text-brand-black font-medium">{user?.email}</span>
          </p>
        </div>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-black hover:text-brand-taupe transition-colors self-start md:self-auto"
        >
          Browse Catalogue <ArrowRight size={14} />
        </Link>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium uppercase tracking-widest text-brand-taupe">
            Loading your orders...
          </p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-rose-50 border border-rose-200 p-8 text-center max-w-xl mx-auto my-12 rounded-sm">
          <AlertCircle size={36} className="text-rose-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-rose-900 uppercase tracking-wider mb-2">
            Unable to Load Orders
          </h3>
          <p className="text-sm text-rose-700 mb-6">
            {(error as Error)?.message || 'An error occurred while fetching your orders. Please try again.'}
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-rose-700 text-brand-white text-xs font-semibold uppercase tracking-wider hover:bg-rose-800 transition-colors"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && orders && orders.length === 0 && (
        <div className="bg-brand-stone/10 border border-brand-stone/30 p-12 md:p-16 text-center max-w-xl mx-auto my-8">
          <div className="w-16 h-16 bg-brand-white border border-brand-stone/40 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xs">
            <ShoppingBag size={28} className="text-brand-taupe" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-display uppercase tracking-widest text-brand-black mb-3">
            No Orders Yet
          </h2>
          <p className="text-sm text-brand-taupe max-w-md mx-auto mb-8 leading-relaxed">
            You haven't placed any orders with this account yet. When you make a purchase, your order history and tracking details will appear here.
          </p>
          <Link
            to="/shop"
            className="inline-block px-8 py-3.5 bg-brand-black text-brand-white text-xs font-semibold uppercase tracking-widest hover:bg-brand-black/90 transition-colors shadow-xs"
          >
            Start Shopping
          </Link>
        </div>
      )}

      {/* Orders List */}
      {!isLoading && !isError && orders && orders.length > 0 && (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.orderNumber}
              className="bg-brand-white border border-brand-stone/40 p-6 md:p-8 shadow-xs hover:border-brand-black/30 transition-colors"
            >
              {/* Order Header / Metadata Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-brand-stone/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-base font-semibold font-display tracking-wider text-brand-black">
                      #{order.orderNumber}
                    </span>
                    {getOrderStatusBadge(order.status)}
                    {getPaymentStatusBadge(order.paymentStatus)}
                  </div>
                  <p className="text-xs text-brand-taupe">
                    Placed on {formatDate(order.createdAt)}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-xs uppercase tracking-wider text-brand-taupe">Order Total</div>
                  <div className="text-lg font-semibold text-brand-black">
                    KES {Number(order.total).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Order Items Preview */}
              <div className="py-5">
                <div className="text-xs font-bold uppercase tracking-wider text-brand-taupe mb-3">
                  Items ({order.items.reduce((sum, item) => sum + item.quantity, 0)})
                </div>
                <div className="divide-y divide-brand-stone/15">
                  {order.items.map((item, idx) => (
                    <div
                      key={item.id || `${item.productName}-${idx}`}
                      className="py-2.5 flex items-center justify-between text-sm gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-brand-black">{item.productName}</span>
                        {item.variantInfo && (
                          <span className="text-brand-taupe text-xs ml-2">({item.variantInfo})</span>
                        )}
                        <span className="text-brand-taupe text-xs ml-2">× {item.quantity}</span>
                      </div>
                      <div className="text-sm font-medium text-brand-black whitespace-nowrap">
                        KES {Number(item.totalPrice).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Footer & Actions */}
              <div className="pt-4 border-t border-brand-stone/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-brand-taupe">
                  <span className="font-semibold text-brand-black uppercase tracking-wider">Delivery:</span>{' '}
                  {order.deliveryAddress && order.deliveryAddress !== 'N/A'
                    ? `${order.deliveryAddress}, ${order.county}`
                    : order.county}
                </div>

                <Link
                  to={`/order-confirmation/${order.orderNumber}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-brand-black hover:text-brand-taupe transition-colors self-start sm:self-auto py-1"
                >
                  View Order Details <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
