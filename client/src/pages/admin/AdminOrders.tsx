import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdminOrders, updateAdminOrderStatus } from '../../services/adminApi';
import { Check, Eye, X } from 'lucide-react';

export const AdminOrders: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, string>>({});

  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: fetchAdminOrders
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => updateAdminOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    }
  });

  const handleStatusChange = (id: string, newStatus: string) => {
    setStatusUpdates(prev => ({ ...prev, [id]: newStatus }));
  };

  const handleSaveStatus = (id: string) => {
    const status = statusUpdates[id];
    if (status) {
      updateStatusMutation.mutate({ id, status });
    }
  };

  if (isLoading) return <div className="p-8 text-center text-brand-taupe">Loading orders...</div>;
  if (isError) return <div className="p-8 text-center text-red-500">Failed to load orders.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display uppercase tracking-widest text-brand-black mb-2">Orders</h1>
          <p className="text-brand-taupe text-sm">Manage customer orders and status.</p>
        </div>
      </div>

      <div className="bg-brand-white border border-brand-stone/30 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-brand-stone/10 border-b border-brand-stone/30 uppercase tracking-wider text-xs font-semibold text-brand-black">
              <tr>
                <th className="px-6 py-4">Order Number</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-stone/20">
              {orders?.map((order: any) => (
                <tr key={order.id} className="hover:bg-brand-stone/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-brand-black">
                    {order.orderNumber}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-brand-black">{order.customerName}</div>
                    <div className="text-brand-taupe text-xs">{order.customerEmail}</div>
                  </td>
                  <td className="px-6 py-4 text-brand-taupe">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-medium">
                    KES {Number(order.total).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    <select 
                      value={statusUpdates[order.id] || order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className={`text-xs border p-1 rounded-sm focus:outline-none ${statusUpdates[order.id] && statusUpdates[order.id] !== order.status ? 'border-brand-black' : 'border-brand-stone'}`}
                    >
                      <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                      <option value="PROCESSING">PROCESSING</option>
                      <option value="SHIPPED">SHIPPED</option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                    {statusUpdates[order.id] && statusUpdates[order.id] !== order.status && (
                       <button onClick={() => handleSaveStatus(order.id)} className="text-brand-black p-1 bg-brand-stone/20 hover:bg-brand-stone/40 rounded">
                         <Check size={14} />
                       </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedOrder(order)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-brand-stone/20 text-brand-black transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {(!orders || orders.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-brand-taupe">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Order Details */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-black/50">
          <div className="bg-brand-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-brand-stone/30 sticky top-0 bg-brand-white">
              <h2 className="text-xl font-display uppercase tracking-widest text-brand-black">Order #{selectedOrder.orderNumber}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-brand-taupe hover:text-brand-black">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 text-sm">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold uppercase tracking-widest mb-2 border-b border-brand-stone/30 pb-1">Customer Info</h3>
                  <p><span className="text-brand-taupe">Name:</span> {selectedOrder.customerName}</p>
                  <p><span className="text-brand-taupe">Email:</span> {selectedOrder.customerEmail}</p>
                  <p><span className="text-brand-taupe">Phone:</span> {selectedOrder.customerPhone}</p>
                  {selectedOrder.userId && <p><span className="text-brand-taupe">Registered User:</span> Yes</p>}
                </div>
                <div>
                  <h3 className="font-semibold uppercase tracking-widest mb-2 border-b border-brand-stone/30 pb-1">Delivery</h3>
                  <p><span className="text-brand-taupe">Address:</span> {selectedOrder.deliveryAddress}</p>
                  <p><span className="text-brand-taupe">County:</span> {selectedOrder.county}</p>
                  {selectedOrder.deliveryNotes && <p><span className="text-brand-taupe">Notes:</span> {selectedOrder.deliveryNotes}</p>}
                </div>
              </div>

              <div>
                <h3 className="font-semibold uppercase tracking-widest mb-2 border-b border-brand-stone/30 pb-1">Order Items</h3>
                <div className="border border-brand-stone/30 rounded overflow-hidden">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-brand-stone/10 border-b border-brand-stone/30">
                      <tr>
                        <th className="px-4 py-2">Item</th>
                        <th className="px-4 py-2">Variant</th>
                        <th className="px-4 py-2 text-right">Price</th>
                        <th className="px-4 py-2 text-right">Qty</th>
                        <th className="px-4 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-stone/20">
                      {selectedOrder.items?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">{item.productName}</td>
                          <td className="px-4 py-3 text-brand-taupe">{item.variantInfo || '-'}</td>
                          <td className="px-4 py-3 text-right">KES {Number(item.unitPrice).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{item.quantity}</td>
                          <td className="px-4 py-3 text-right font-medium">KES {Number(item.totalPrice).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end text-sm">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-brand-taupe">Subtotal:</span>
                    <span>KES {Number(selectedOrder.subtotal).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-taupe">Delivery Fee:</span>
                    <span>KES {Number(selectedOrder.deliveryFee).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-brand-stone/30 font-bold text-lg">
                    <span>Total:</span>
                    <span>KES {Number(selectedOrder.total).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
