import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { getOrder } from '../services/orderApi';

export const OrderConfirmation: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderNumber) {
      navigate('/');
      return;
    }

    const fetchOrder = async () => {
      try {
        const data = await getOrder(orderNumber);
        setOrder(data);
      } catch (err) {
        setError('Failed to load order details.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderNumber, navigate]);

  if (loading) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="w-8 h-8 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-brand-taupe">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-display uppercase tracking-widest mb-4 text-red-600">Order Not Found</h1>
        <p className="text-brand-taupe mb-8">{error || 'We could not find the order you are looking for.'}</p>
        <button
          onClick={() => navigate('/shop')}
          className="px-8 py-4 bg-brand-black text-brand-white text-sm font-semibold uppercase tracking-widest hover:bg-brand-black/90 transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-16 md:py-24 text-center flex flex-col items-center">
      <CheckCircle size={64} className="text-brand-gold mb-6" />
      <h1 className="text-3xl md:text-4xl font-display uppercase tracking-widest mb-4">Order Confirmed</h1>
      <p className="text-brand-taupe mb-2">Thank you for your purchase, {order.customerName}.</p>
      <p className="text-brand-taupe mb-8">Your order #{order.orderNumber} is being processed.</p>

      <div className="bg-brand-stone/10 p-6 md:p-8 w-full max-w-2xl text-left mb-8 border border-brand-stone/30">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-b border-brand-stone/30 pb-6">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest mb-4 border-b border-brand-stone/30 pb-2">Order Details</h3>
            <div className="space-y-2 text-sm text-brand-black">
              <p className="flex justify-between"><span className="text-brand-taupe">Order Status:</span> {order.status}</p>
              <p className="flex justify-between"><span className="text-brand-taupe">Payment Status:</span> {order.paymentStatus}</p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest mb-4 border-b border-brand-stone/30 pb-2">Delivery Address</h3>
            <div className="text-sm text-brand-black space-y-1">
              <p>{order.customerName}</p>
              <p>{order.deliveryAddress}</p>
              <p>{order.county}, Kenya</p>
              <p>{order.customerPhone}</p>
            </div>
          </div>
        </div>

        <h3 className="text-sm font-semibold uppercase tracking-widest mb-4 border-b border-brand-stone/30 pb-2">Items Ordered</h3>
        <div className="space-y-4 mb-6 border-b border-brand-stone/30 pb-6">
          {order.items.map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm">
              <div className="flex-grow">
                <span className="font-medium">{item.productName}</span>
                {item.variantInfo && <span className="text-brand-taupe ml-2">({item.variantInfo})</span>}
                <div className="text-brand-taupe">Qty: {item.quantity}</div>
              </div>
              <div className="text-right">
                KES {Number(item.totalPrice).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 text-sm text-brand-black mb-6 border-b border-brand-stone/30 pb-6">
          <p className="flex justify-between"><span className="text-brand-taupe">Subtotal:</span> KES {Number(order.subtotal).toLocaleString()}</p>
          <p className="flex justify-between"><span className="text-brand-taupe">Delivery Fee:</span> KES {Number(order.deliveryFee).toLocaleString()}</p>
        </div>
        
        <div className="flex justify-between items-center text-lg md:text-xl font-bold">
          <span className="uppercase tracking-widest">Total</span>
          <span>KES {Number(order.total).toLocaleString()}</span>
        </div>
      </div>

      <button
        onClick={() => navigate('/shop')}
        className="px-8 py-4 bg-brand-black text-brand-white text-sm font-semibold uppercase tracking-widest hover:bg-brand-black/90 transition-colors"
      >
        Continue Shopping
      </button>
    </div>
  );
};
