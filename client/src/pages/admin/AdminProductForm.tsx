import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchAdminCategories, 
  fetchAdminProductById, 
  createAdminProduct, 
  updateAdminProduct 
} from '../../services/adminApi';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

export const AdminProductForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    categoryId: '',
    featured: false,
    newArrival: false,
    details: [''],
    images: [''],
    variants: [
      { color: '', colorHex: '', size: '', stock: 0, sku: '' }
    ]
  });

  const { data: categories } = useQuery({
    queryKey: ['adminCategories'],
    queryFn: fetchAdminCategories,
  });

  const { data: initialProduct, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['adminProduct', id],
    queryFn: () => fetchAdminProductById(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (isEdit && initialProduct) {
      setFormData({
        name: initialProduct.name || '',
        description: initialProduct.description || '',
        price: Number(initialProduct.price) || 0,
        categoryId: initialProduct.categoryId || '',
        featured: initialProduct.featured || false,
        newArrival: initialProduct.newArrival || false,
        details: initialProduct.details?.length ? initialProduct.details : [''],
        images: initialProduct.images?.length 
          ? initialProduct.images.map((img: any) => img.imageUrl) 
          : [''],
        variants: initialProduct.variants?.length 
          ? initialProduct.variants.map((v: any) => ({
              color: v.color || '',
              colorHex: v.colorHex || '',
              size: v.size || '',
              stock: v.stock || 0,
              sku: v.sku || ''
            }))
          : [{ color: '', colorHex: '', size: '', stock: 0, sku: '' }]
      });
    }
  }, [isEdit, initialProduct]);

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit ? updateAdminProduct(id!, data) : createAdminProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
      navigate('/admin/products');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean up empty arrays
    const cleanData = {
      ...formData,
      details: formData.details.filter(d => d.trim() !== ''),
      images: formData.images.filter(i => i.trim() !== ''),
      variants: formData.variants.filter(v => v.sku.trim() !== '')
    };
    
    mutation.mutate(cleanData);
  };

  const handleArrayChange = (field: 'details' | 'images', index: number, value: string) => {
    const newArr = [...formData[field]];
    newArr[index] = value;
    setFormData({ ...formData, [field]: newArr });
  };

  const addArrayItem = (field: 'details' | 'images') => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };

  const removeArrayItem = (field: 'details' | 'images', index: number) => {
    const newArr = formData[field].filter((_, i) => i !== index);
    if (newArr.length === 0) newArr.push('');
    setFormData({ ...formData, [field]: newArr });
  };

  const handleVariantChange = (index: number, key: string, value: string | number) => {
    const newVariants = [...formData.variants];
    newVariants[index] = { ...newVariants[index], [key]: value };
    setFormData({ ...formData, variants: newVariants });
  };

  const addVariant = () => {
    setFormData({ 
      ...formData, 
      variants: [...formData.variants, { color: '', colorHex: '', size: '', stock: 0, sku: '' }] 
    });
  };

  const removeVariant = (index: number) => {
    const newVariants = formData.variants.filter((_, i) => i !== index);
    if (newVariants.length === 0) {
      newVariants.push({ color: '', colorHex: '', size: '', stock: 0, sku: '' });
    }
    setFormData({ ...formData, variants: newVariants });
  };

  if (isEdit && isLoadingProduct) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin/products" className="text-brand-taupe hover:text-brand-black transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-3xl font-display uppercase tracking-widest">
          {isEdit ? 'Edit Product' : 'Add Product'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-brand-white p-6 shadow-sm border border-brand-stone">
        
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold uppercase tracking-wide border-b border-brand-stone pb-2">Basic Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-taupe mb-1">Product Name *</label>
              <input 
                type="text" required
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full border border-brand-stone p-2 focus:outline-none focus:border-brand-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-taupe mb-1">Price (KES) *</label>
              <input 
                type="number" required min="0"
                value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                className="w-full border border-brand-stone p-2 focus:outline-none focus:border-brand-black"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-brand-taupe mb-1">Category *</label>
            <select 
              required
              value={formData.categoryId} 
              onChange={e => setFormData({...formData, categoryId: e.target.value})}
              className="w-full border border-brand-stone p-2 focus:outline-none focus:border-brand-black"
            >
              <option value="">Select a category</option>
              {categories?.map((rootCat: any) => (
                rootCat.children?.length > 0 ? (
                  <optgroup key={rootCat.id} label={rootCat.name}>
                    {rootCat.children.map((child: any) => (
                      <option key={child.id} value={child.id}>{child.name}</option>
                    ))}
                  </optgroup>
                ) : (
                  <option key={rootCat.id} value={rootCat.id}>{rootCat.name}</option>
                )
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-taupe mb-1">Description</label>
            <textarea 
              rows={4}
              value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full border border-brand-stone p-2 focus:outline-none focus:border-brand-black"
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input 
                type="checkbox" 
                checked={formData.featured} 
                onChange={e => setFormData({...formData, featured: e.target.checked})}
              />
              Featured Product
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input 
                type="checkbox" 
                checked={formData.newArrival} 
                onChange={e => setFormData({...formData, newArrival: e.target.checked})}
              />
              New Arrival
            </label>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold uppercase tracking-wide border-b border-brand-stone pb-2">Details (Bullet Points)</h2>
          {formData.details.map((detail, index) => (
            <div key={index} className="flex gap-2">
              <input 
                type="text" 
                value={detail} 
                onChange={e => handleArrayChange('details', index, e.target.value)}
                placeholder="e.g. 100% Cotton"
                className="flex-1 border border-brand-stone p-2 focus:outline-none focus:border-brand-black"
              />
              <button type="button" onClick={() => removeArrayItem('details', index)} className="p-2 text-brand-taupe hover:text-red-500">
                <Trash2 size={20} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => addArrayItem('details')} className="text-sm font-medium flex items-center gap-1 hover:text-brand-taupe">
            <Plus size={16} /> Add another detail
          </button>
        </div>

        {/* Images */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold uppercase tracking-wide border-b border-brand-stone pb-2">Images (URLs)</h2>
          {formData.images.map((img, index) => (
            <div key={index} className="flex gap-2">
              <input 
                type="url" 
                value={img} 
                onChange={e => handleArrayChange('images', index, e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 border border-brand-stone p-2 focus:outline-none focus:border-brand-black"
              />
              <button type="button" onClick={() => removeArrayItem('images', index)} className="p-2 text-brand-taupe hover:text-red-500">
                <Trash2 size={20} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => addArrayItem('images')} className="text-sm font-medium flex items-center gap-1 hover:text-brand-taupe">
            <Plus size={16} /> Add another image
          </button>
        </div>

        {/* Variants */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold uppercase tracking-wide border-b border-brand-stone pb-2">Variants</h2>
          <div className="space-y-4">
            {formData.variants.map((variant, index) => (
              <div key={index} className="flex flex-wrap gap-2 items-end border border-brand-stone/50 p-4 bg-brand-stone/5">
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs font-medium text-brand-taupe mb-1">Color</label>
                  <input 
                    type="text" placeholder="e.g. Black"
                    value={variant.color} onChange={e => handleVariantChange(index, 'color', e.target.value)}
                    className="w-full border border-brand-stone p-2 focus:outline-none text-sm"
                  />
                </div>
                <div className="flex-1 min-w-[100px]">
                  <label className="block text-xs font-medium text-brand-taupe mb-1">Color Hex</label>
                  <input 
                    type="text" placeholder="#000000"
                    value={variant.colorHex} onChange={e => handleVariantChange(index, 'colorHex', e.target.value)}
                    className="w-full border border-brand-stone p-2 focus:outline-none text-sm"
                  />
                </div>
                <div className="flex-1 min-w-[80px]">
                  <label className="block text-xs font-medium text-brand-taupe mb-1">Size</label>
                  <input 
                    type="text" placeholder="e.g. M"
                    value={variant.size} onChange={e => handleVariantChange(index, 'size', e.target.value)}
                    className="w-full border border-brand-stone p-2 focus:outline-none text-sm"
                  />
                </div>
                <div className="flex-1 min-w-[80px]">
                  <label className="block text-xs font-medium text-brand-taupe mb-1">Stock</label>
                  <input 
                    type="number" min="0" required
                    value={variant.stock} onChange={e => handleVariantChange(index, 'stock', Number(e.target.value))}
                    className="w-full border border-brand-stone p-2 focus:outline-none text-sm"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs font-medium text-brand-taupe mb-1">SKU *</label>
                  <input 
                    type="text" required placeholder="SKU-123"
                    value={variant.sku} onChange={e => handleVariantChange(index, 'sku', e.target.value)}
                    className="w-full border border-brand-stone p-2 focus:outline-none text-sm"
                  />
                </div>
                <button type="button" onClick={() => removeVariant(index)} className="p-2 text-brand-taupe hover:text-red-500">
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addVariant} className="text-sm font-medium flex items-center gap-1 hover:text-brand-taupe">
            <Plus size={16} /> Add variant
          </button>
        </div>

        {/* Submit */}
        <div className="pt-6 border-t border-brand-stone">
          <button 
            type="submit" 
            disabled={mutation.isPending}
            className="w-full bg-brand-black text-brand-white py-4 uppercase tracking-widest font-medium hover:bg-brand-taupe transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : (isEdit ? 'Update Product' : 'Create Product')}
          </button>
          {mutation.isError && (
            <p className="mt-2 text-red-500 text-sm text-center">An error occurred while saving.</p>
          )}
        </div>

      </form>
    </div>
  );
};
