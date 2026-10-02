import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchAdminProducts, deleteAdminProduct } from '../../services/adminApi';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ['adminProducts'],
    queryFn: fetchAdminProducts,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center uppercase tracking-widest text-brand-taupe">Loading Products...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display uppercase tracking-widest">Products</h1>
        <Link 
          to="/admin/products/new"
          className="flex items-center gap-2 bg-brand-black text-brand-white px-4 py-2 uppercase tracking-wide text-sm hover:bg-brand-taupe transition-colors"
        >
          <Plus size={16} /> Add Product
        </Link>
      </div>

      <div className="bg-brand-white shadow-sm border border-brand-stone overflow-x-auto">
        <table className="w-full text-left text-sm text-brand-black">
          <thead className="bg-brand-stone/30 uppercase tracking-widest text-xs border-b border-brand-stone">
            <tr>
              <th className="px-6 py-4 font-medium">Image</th>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Category</th>
              <th className="px-6 py-4 font-medium">Price</th>
              <th className="px-6 py-4 font-medium">Stock</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-stone/50">
            {products?.map((product: any) => {
              const totalStock = product.variants.reduce((sum: number, v: any) => sum + v.stock, 0);
              const mainImage = product.images.find((img: any) => img.displayOrder === 0) || product.images[0];
              
              return (
                <tr key={product.id} className="hover:bg-brand-stone/10 transition-colors">
                  <td className="px-6 py-4">
                    {mainImage ? (
                      <img src={mainImage.imageUrl} alt={product.name} className="w-12 h-16 object-cover bg-brand-stone/30" />
                    ) : (
                      <div className="w-12 h-16 bg-brand-stone/20 flex items-center justify-center text-[10px] text-brand-taupe">No Img</div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium">{product.name}</td>
                  <td className="px-6 py-4">{product.category.name}</td>
                  <td className="px-6 py-4">KES {Number(product.price).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-bold ${totalStock > 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                      {totalStock} in stock
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-xs">
                      {product.featured && <span className="bg-brand-gold/20 text-brand-black px-2 py-0.5 w-max">Featured</span>}
                      {product.newArrival && <span className="bg-brand-stone text-brand-black px-2 py-0.5 w-max">New</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <Link 
                        to={`/admin/products/${product.id}/edit`}
                        className="text-brand-taupe hover:text-brand-black transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </Link>
                      <button 
                        onClick={() => handleDelete(product.id, product.name)}
                        className="text-brand-taupe hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {(!products || products.length === 0) && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-brand-taupe">
                  No products found. Add your first product!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
