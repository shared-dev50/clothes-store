import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchAdminCategories, 
  fetchAdminProductById, 
  createAdminProduct, 
  updateAdminProduct,
  getCloudinaryConfig,
  generateCloudinarySignature
} from '../../services/adminApi';
import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react';

const PREDEFINED_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Red', hex: '#FF0000' },
  { name: 'Blue', hex: '#0000FF' },
  { name: 'Green', hex: '#008000' },
  { name: 'Pink', hex: '#FFC0CB' },
  { name: 'Brown', hex: '#8B4513' },
  { name: 'Beige/Cream', hex: '#F5F5DC' },
  { name: 'Grey', hex: '#808080' },
  { name: 'Purple', hex: '#800080' },
  { name: 'Orange', hex: '#FFA500' },
];

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
      { id: undefined, color: '', colorHex: '', size: '', stock: 0, sku: '', isArchived: false }
    ]
  });

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
              id: v.id,
              color: v.color || '',
              colorHex: v.colorHex || '',
              size: v.size || '',
              stock: v.stock || 0,
              sku: v.sku || '',
              isArchived: v.isArchived || false
            }))
          : [{ id: undefined, color: '', colorHex: '', size: '', stock: 0, sku: '', isArchived: false }]
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
      variants: formData.variants.filter(v => v.color.trim() !== '' || v.size.trim() !== '')
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
    if (newArr.length === 0 && field === 'details') newArr.push('');
    setFormData({ ...formData, [field]: newArr });
  };

  const openCloudinaryWidget = async () => {
    try {
      setUploadError(null);
      setUploading(true);
      
      const config = await getCloudinaryConfig();
      
      const widget = (window as any).cloudinary.createUploadWidget(
        {
          cloudName: config.cloudName,
          apiKey: config.apiKey,
          uploadSignature: generateCloudinarySignature,
          folder: config.folder,
          cropping: true,
          croppingAspectRatio: 1, // Square 1:1 crop
          showSkipCropButton: false,
          multiple: true,
          defaultSource: 'local',
          clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
          maxFileSize: 5000000,
        },
        (error: any, result: any) => {
          if (!error && result && result.event === "success") {
            let secureUrl = result.info.secure_url;
            
            // Add automatic format and quality optimization if it's a Cloudinary URL
            if (secureUrl.includes('/upload/')) {
              secureUrl = secureUrl.replace('/upload/', '/upload/f_auto,q_auto/');
            }
            
            setFormData(prev => {
              const currentImages = prev.images.filter(i => i.trim() !== '');
              return { ...prev, images: [...currentImages, secureUrl] };
            });
          } else if (error) {
            setUploadError(error.message || 'Failed to upload image');
          }
          
          if (result && (result.event === "close" || result.event === "abort")) {
            setUploading(false);
          }
        }
      );
      
      widget.open();
    } catch (err: any) {
      setUploading(false);
      setUploadError(err.message || 'Failed to initialize upload widget');
    }
  };

  const handleVariantChange = (index: number, key: string, value: string | number | boolean) => {
    setFormData(prev => {
      const newVariants = [...prev.variants];
      newVariants[index] = { ...newVariants[index], [key]: value };
      return { ...prev, variants: newVariants };
    });
  };

  const addVariant = () => {
    setFormData({ 
      ...formData, 
      variants: [...formData.variants, { id: undefined, color: '', colorHex: '', size: '', stock: 0, sku: '', isArchived: false }] 
    });
  };

  const removeVariant = (index: number) => {
    const newVariants = formData.variants.filter((_, i) => i !== index);
    if (newVariants.length === 0) {
      newVariants.push({ id: undefined, color: '', colorHex: '', size: '', stock: 0, sku: '', isArchived: false });
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
          <div className="flex justify-between items-end border-b border-brand-stone pb-2">
            <h2 className="text-lg font-semibold uppercase tracking-wide">Images</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {formData.images.filter(img => img.trim() !== '').map((img, index) => (
              <div key={index} className="relative group aspect-square border border-brand-stone bg-brand-stone/10">
                <img src={img} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                <button 
                  type="button" 
                  onClick={() => removeArrayItem('images', index)} 
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-red-600 shadow-md"
                >
                  <Trash2 size={16} />
                </button>
                <div className="absolute top-2 left-2 px-2 py-1 bg-brand-black/70 text-white text-xs rounded shadow-md">
                  {index === 0 ? 'Primary' : `#${index + 1}`}
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={openCloudinaryWidget}
              disabled={uploading}
              className={`aspect-square border border-dashed border-brand-stone flex flex-col items-center justify-center cursor-pointer hover:bg-brand-stone/5 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {uploading ? (
                <div className="w-6 h-6 border-2 border-brand-black border-t-transparent rounded-full animate-spin mb-2" />
              ) : (
                <Upload size={24} className="text-brand-taupe mb-2" />
              )}
              <span className="text-sm font-medium text-brand-taupe text-center px-2">
                {uploading ? 'Uploading/Cropping...' : 'Upload Images'}
              </span>
            </button>
          </div>
          {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}
          <p className="text-xs text-brand-taupe">Allowed formats: JPG, PNG, WEBP. Max size: 5MB per image.</p>
        </div>

        {/* Variants */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold uppercase tracking-wide border-b border-brand-stone pb-2">Variants</h2>
          <div className="space-y-4">
            {formData.variants.map((variant, index) => (
              <div key={index} className={`flex flex-col gap-4 border p-4 ${variant.isArchived ? 'border-red-200 bg-red-50 opacity-75' : 'border-brand-stone/50 bg-brand-stone/5'}`}>
                {variant.isArchived && (
                  <div className="text-xs font-semibold text-red-600 uppercase tracking-wide">Archived Variant</div>
                )}
                <div className="flex flex-wrap gap-4 items-start">
                  
                  {/* Color Selection */}
                  <div className="flex-1 min-w-[250px] space-y-3">
                    <label className="block text-xs font-medium text-brand-taupe">Color</label>
                    <div className="flex flex-wrap gap-2">
                      {PREDEFINED_COLORS.map(c => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => {
                            handleVariantChange(index, 'color', c.name);
                            handleVariantChange(index, 'colorHex', c.hex);
                          }}
                          className={`w-6 h-6 rounded-full border border-gray-400 shadow-sm transition-transform ${variant.colorHex === c.hex ? 'scale-125 border-brand-black ring-1 ring-brand-black ring-offset-1' : 'hover:scale-110'}`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}
                      {/* Custom Color Native Picker */}
                      <div className="flex items-center gap-2 ml-2 pl-2 border-l border-brand-stone/50">
                        <span className="text-xs font-medium text-brand-taupe">Custom:</span>
                        <input
                          type="color"
                          value={variant.colorHex || '#000000'}
                          onChange={(e) => {
                            handleVariantChange(index, 'colorHex', e.target.value);
                            if (PREDEFINED_COLORS.some(c => c.name === variant.color)) {
                                handleVariantChange(index, 'color', '');
                            }
                          }}
                          className="w-8 h-8 p-0 border-0 cursor-pointer rounded overflow-hidden hover:scale-110 transition-transform"
                          title="Custom Color"
                        />
                      </div>
                    </div>
                    {/* Color Name Input */}
                    <div>
                      <input 
                        type="text" 
                        required
                        placeholder="Color Name (e.g. Burgundy)"
                        value={variant.color} 
                        onChange={e => handleVariantChange(index, 'color', e.target.value)}
                        className="w-full border border-brand-stone p-2 focus:outline-none text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Size and Stock */}
                  <div className="flex-1 min-w-[150px] flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-brand-taupe mb-1">Size</label>
                      <input 
                        type="text" placeholder="e.g. M"
                        value={variant.size} onChange={e => handleVariantChange(index, 'size', e.target.value)}
                        className="w-full border border-brand-stone p-2 focus:outline-none text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-brand-taupe mb-1">Stock</label>
                      <input 
                        type="number" min="0" required
                        value={variant.stock} onChange={e => handleVariantChange(index, 'stock', Number(e.target.value))}
                        className="w-full border border-brand-stone p-2 focus:outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center gap-2 mt-4 pl-4 border-l border-brand-stone/50">
                    <button 
                      type="button" 
                      onClick={() => handleVariantChange(index, 'isArchived', !variant.isArchived)} 
                      className={`text-xs font-medium px-2 py-1 border rounded transition-colors ${variant.isArchived ? 'text-green-600 border-green-600 hover:bg-green-50' : 'text-orange-500 border-orange-500 hover:bg-orange-50'}`}
                    >
                      {variant.isArchived ? 'Restore' : 'Archive'}
                    </button>
                    <button type="button" onClick={() => removeVariant(index)} className="p-2 text-brand-taupe hover:text-red-500">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
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
