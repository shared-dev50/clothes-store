import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Upload, Eye, Save, ArrowUp, ArrowDown } from 'lucide-react';
import {
  fetchHomepageSettingsAdmin,
  updateHomepageSettingsAdmin,
  getCloudinaryConfig,
  generateCloudinarySignature,
} from '../../services/adminApi';
import { setCachedHomepageSettings } from '../../services/productApi';
import type { HomepageSettings, LifestyleCardItem } from '../../types';

const COMMON_DESTINATIONS = [
  { label: 'Shop All Products (/shop)', value: '/shop' },
  { label: 'New Arrivals (/shop?category=new)', value: '/shop?category=new' },
  { label: 'Wellness (/shop?category=Wellness)', value: '/shop?category=Wellness' },
  { label: 'Weight Management (/shop?category=Weight Management)', value: '/shop?category=Weight Management' },
  { label: 'Wigs & Hair (/shop?category=Wigs & Hair)', value: '/shop?category=Wigs & Hair' },
  { label: 'Men (/shop?category=Men)', value: '/shop?category=Men' },
  { label: 'Women (/shop?category=Women)', value: '/shop?category=Women' },
  { label: 'Kids (/shop?category=Kids)', value: '/shop?category=Kids' },
  { label: 'Clothing (/shop?category=Clothing)', value: '/shop?category=Clothing' },
  { label: 'Handbags (/shop?category=Handbags)', value: '/shop?category=Handbags' },
  { label: 'Shoes (/shop?category=Shoes)', value: '/shop?category=Shoes' },
  { label: 'Pajamas (/shop?category=Pajamas)', value: '/shop?category=Pajamas' },
];

export const AdminHomepageSettings: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: initialSettings, isLoading } = useQuery<HomepageSettings>({
    queryKey: ['adminHomepageSettings'],
    queryFn: fetchHomepageSettingsAdmin,
  });

  const [form, setForm] = useState<Partial<HomepageSettings>>({});
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isUploading, setIsUploading] = useState<string | null>(null);

  useEffect(() => {
    if (initialSettings) {
      setForm(initialSettings);
    }
  }, [initialSettings]);

  const mutation = useMutation({
    mutationFn: updateHomepageSettingsAdmin,
    onSuccess: (updated) => {
      setCachedHomepageSettings(updated);
      queryClient.setQueryData(['adminHomepageSettings'], updated);
      queryClient.setQueryData(['homepageSettings'], updated);
      queryClient.invalidateQueries({ queryKey: ['homepageSettings'] });
      toast.success('Homepage settings saved successfully!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save homepage settings.');
    },
  });

  const handleOpenCloudinary = async (fieldKey: string, cardIndex?: number) => {
    setIsUploading(fieldKey);
    try {
      if (!(window as any).cloudinary) {
        toast.error('Cloudinary widget is loading or unavailable. You can enter an image URL directly.');
        setIsUploading(null);
        return;
      }

      const config = await getCloudinaryConfig();
      const widget = (window as any).cloudinary.createUploadWidget(
        {
          cloudName: config.cloudName,
          apiKey: config.apiKey,
          uploadSignature: generateCloudinarySignature,
          folder: config.folder || 'hbs-wear/homepage',
          cropping: false,
          multiple: false,
          sources: ['local', 'url'],
          resourceType: 'image',
          clientAllowedFormats: ['png', 'jpeg', 'jpg', 'webp'],
          maxFileSize: 10000000,
        },
        (error: any, result: any) => {
          if (!error && result && result.event === 'success') {
            const uploadedUrl = result.info.secure_url;
            if (typeof cardIndex === 'number') {
              updateCard(cardIndex, { imageUrl: uploadedUrl });
            } else {
              setForm((prev) => ({ ...prev, [fieldKey]: uploadedUrl }));
            }
            toast.success('Image uploaded!');
          }
          if (result && (result.event === 'close' || result.event === 'success')) {
            setIsUploading(null);
          }
        }
      );
      widget.open();
    } catch (err: any) {
      console.error('Cloudinary error:', err);
      toast.error(err.message || 'Could not open Cloudinary widget.');
      setIsUploading(null);
    }
  };

  const updateCard = (index: number, changes: Partial<LifestyleCardItem>) => {
    setForm((prev) => {
      const cards = [...(prev.lifestyleCards || [])];
      if (cards[index]) {
        cards[index] = { ...cards[index], ...changes };
      }
      return { ...prev, lifestyleCards: cards };
    });
  };

  const moveCard = (index: number, direction: 'up' | 'down') => {
    setForm((prev) => {
      const cards = [...(prev.lifestyleCards || [])];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= cards.length) return prev;

      const temp = cards[index];
      cards[index] = cards[targetIndex];
      cards[targetIndex] = temp;

      // Re-assign sequential orders
      cards.forEach((c, idx) => {
        c.order = idx + 1;
      });

      return { ...prev, lifestyleCards: cards };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  if (isLoading) {
    return <div className="p-12 text-center uppercase tracking-widest text-brand-taupe">Loading Settings...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display uppercase tracking-widest">Homepage Customization</h1>
          <p className="text-sm text-brand-taupe mt-1">
            Manage the hero banner, navbar color palette, and curated lifestyle cards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'editor' ? 'preview' : 'editor')}
            className="flex items-center gap-2 border border-brand-stone px-4 py-2 text-xs uppercase tracking-wider font-semibold hover:bg-brand-stone/30 transition-colors"
          >
            <Eye size={16} /> {activeTab === 'editor' ? 'Live Preview' : 'Back to Editor'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="flex items-center gap-2 bg-brand-black text-brand-white px-5 py-2 text-xs uppercase tracking-widest font-semibold hover:bg-brand-taupe transition-colors disabled:opacity-50"
          >
            <Save size={16} /> {mutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {activeTab === 'preview' ? (
        /* Preview Mode */
        <div className="bg-brand-white border border-brand-stone p-6 shadow-sm">
          <h2 className="text-lg font-display uppercase tracking-wider mb-6 pb-2 border-b border-brand-stone">
            Hero &amp; Lifestyle Preview
          </h2>

          {/* Hero Preview Box */}
          <div className="relative h-[380px] w-full overflow-hidden bg-brand-black flex flex-col justify-end p-8 text-brand-white mb-10">
            {form.heroImageUrl ? (
              <img
                src={form.heroImageUrl}
                alt="Hero Preview"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            ) : (
              <div className="absolute inset-0 bg-neutral-800 flex items-center justify-center text-xs text-neutral-400">
                Default Bundled Hero Image Active
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />

            {/* Top Navbar preview bar */}
            <div
              className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center text-xs uppercase tracking-widest font-semibold border-b border-white/10"
              style={{ color: form.navbarTransparentForeground || '#FAFAFA' }}
            >
              <span>HBS WEAR (Preview)</span>
              <div className="flex gap-4">
                <span>Shop</span>
                <span>Men</span>
                <span>Women</span>
                <span>Kids</span>
              </div>
            </div>

            <div className="relative z-10 max-w-lg">
              <h3 className="text-3xl font-display uppercase font-medium leading-tight mb-2 whitespace-pre-line">
                {form.heroHeading || 'Modern\nHeritage.'}
              </h3>
              <p className="text-xs text-brand-white/80 mb-4 line-clamp-2">
                {form.heroCaption}
              </p>
              <div className="flex gap-2">
                <span className="px-4 py-2 bg-brand-white text-brand-black text-[10px] font-bold uppercase tracking-wider">
                  {form.heroCtaLabel || 'Shop Collection'}
                </span>
                {form.heroCtaSecondaryLabel && (
                  <span className="px-4 py-2 border border-brand-white text-brand-white text-[10px] font-bold uppercase tracking-wider">
                    {form.heroCtaSecondaryLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Lifestyle Cards Preview */}
          <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-taupe mb-4">
            Curated Lifestyle Cards Preview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {form.lifestyleCards
              ?.filter((c) => c.isVisible !== false)
              .map((card) => (
                <div
                  key={card.id}
                  className="relative h-64 overflow-hidden bg-brand-stone/40 flex flex-col justify-end p-4 text-brand-white"
                >
                  {card.imageUrl && (
                    <img src={card.imageUrl} alt={card.title} className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="relative z-10">
                    <span className="text-[9px] uppercase tracking-widest font-bold text-brand-white/70 block mb-1">
                      {card.destination}
                    </span>
                    <h4 className="text-lg font-display uppercase font-medium">{card.title}</h4>
                    <p className="text-xs text-brand-white/80 line-clamp-1">{card.caption}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : (
        /* Editor Mode */
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Section 1: Hero Section */}
          <div className="bg-brand-white border border-brand-stone p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-display uppercase tracking-wider mb-6 pb-2 border-b border-brand-stone flex items-center justify-between">
              <span>1. Hero Banner Content &amp; Media</span>
              <span className="text-xs text-brand-taupe font-normal lowercase">Full-viewport 100svh hero</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Desktop Hero Image */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-black">
                  Desktop Hero Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.heroImageUrl || ''}
                    onChange={(e) => setForm({ ...form, heroImageUrl: e.target.value })}
                    placeholder="Leave blank to use default hero image"
                    className="flex-1 text-sm bg-brand-stone/20 border border-brand-stone px-3 py-2 focus:outline-none focus:border-brand-black"
                  />
                  <button
                    type="button"
                    onClick={() => handleOpenCloudinary('heroImageUrl')}
                    disabled={isUploading === 'heroImageUrl'}
                    className="flex items-center gap-1.5 px-3 py-2 bg-brand-black text-brand-white text-xs font-semibold tracking-wider uppercase hover:bg-brand-taupe transition-colors"
                  >
                    <Upload size={14} /> {isUploading === 'heroImageUrl' ? '...' : 'Upload'}
                  </button>
                </div>
                <p className="text-[11px] text-brand-taupe">
                  Supports Cloudinary uploads or HTTPS image links. If blank, bundled hero asset is used.
                </p>
              </div>

              {/* Mobile Hero Image (Optional) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-black">
                  Mobile Hero Image URL (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.heroMobileImageUrl || ''}
                    onChange={(e) => setForm({ ...form, heroMobileImageUrl: e.target.value })}
                    placeholder="Separate mobile crop/image (optional)"
                    className="flex-1 text-sm bg-brand-stone/20 border border-brand-stone px-3 py-2 focus:outline-none focus:border-brand-black"
                  />
                  <button
                    type="button"
                    onClick={() => handleOpenCloudinary('heroMobileImageUrl')}
                    disabled={isUploading === 'heroMobileImageUrl'}
                    className="flex items-center gap-1.5 px-3 py-2 bg-brand-black text-brand-white text-xs font-semibold tracking-wider uppercase hover:bg-brand-taupe transition-colors"
                  >
                    <Upload size={14} /> {isUploading === 'heroMobileImageUrl' ? '...' : 'Upload'}
                  </button>
                </div>
                <p className="text-[11px] text-brand-taupe">
                  Applied on screens &le; 768px via responsive picture element.
                </p>
              </div>

              {/* Headline */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-black">
                  Hero Headline
                </label>
                <textarea
                  rows={2}
                  value={form.heroHeading || ''}
                  onChange={(e) => setForm({ ...form, heroHeading: e.target.value })}
                  placeholder="e.g. Modern&#10;Heritage."
                  className="w-full text-sm bg-brand-stone/20 border border-brand-stone px-3 py-2 focus:outline-none focus:border-brand-black"
                />
                <p className="text-[11px] text-brand-taupe">Press Enter for a line break in the headline.</p>
              </div>

              {/* Caption */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-black">
                  Hero Caption
                </label>
                <textarea
                  rows={2}
                  value={form.heroCaption || ''}
                  onChange={(e) => setForm({ ...form, heroCaption: e.target.value })}
                  placeholder="Introducing Collection 01..."
                  className="w-full text-sm bg-brand-stone/20 border border-brand-stone px-3 py-2 focus:outline-none focus:border-brand-black"
                />
              </div>

              {/* Primary CTA */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-black">
                  Primary CTA Label
                </label>
                <input
                  type="text"
                  value={form.heroCtaLabel || ''}
                  onChange={(e) => setForm({ ...form, heroCtaLabel: e.target.value })}
                  className="w-full text-sm bg-brand-stone/20 border border-brand-stone px-3 py-2 focus:outline-none focus:border-brand-black"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-black">
                  Primary CTA Destination
                </label>
                <input
                  type="text"
                  value={form.heroCtaLink || ''}
                  onChange={(e) => setForm({ ...form, heroCtaLink: e.target.value })}
                  placeholder="/shop"
                  className="w-full text-sm bg-brand-stone/20 border border-brand-stone px-3 py-2 focus:outline-none focus:border-brand-black"
                />
              </div>

              {/* Secondary CTA */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-black">
                  Secondary CTA Label (Optional)
                </label>
                <input
                  type="text"
                  value={form.heroCtaSecondaryLabel || ''}
                  onChange={(e) => setForm({ ...form, heroCtaSecondaryLabel: e.target.value })}
                  className="w-full text-sm bg-brand-stone/20 border border-brand-stone px-3 py-2 focus:outline-none focus:border-brand-black"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-black">
                  Secondary CTA Destination
                </label>
                <input
                  type="text"
                  value={form.heroCtaSecondaryLink || ''}
                  onChange={(e) => setForm({ ...form, heroCtaSecondaryLink: e.target.value })}
                  placeholder="/shop?category=new"
                  className="w-full text-sm bg-brand-stone/20 border border-brand-stone px-3 py-2 focus:outline-none focus:border-brand-black"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Navbar Color Configuration */}
          <div className="bg-brand-white border border-brand-stone p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-display uppercase tracking-wider mb-6 pb-2 border-b border-brand-stone">
              2. Navbar Color Transitions
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-black">
                  Transparent Nav Foreground / Logo
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.navbarTransparentForeground || '#FAFAFA'}
                    onChange={(e) => setForm({ ...form, navbarTransparentForeground: e.target.value })}
                    className="w-10 h-10 border border-brand-stone cursor-pointer p-0.5 bg-brand-white"
                  />
                  <input
                    type="text"
                    value={form.navbarTransparentForeground || ''}
                    onChange={(e) => setForm({ ...form, navbarTransparentForeground: e.target.value })}
                    className="flex-1 text-sm bg-brand-stone/20 border border-brand-stone px-3 py-2 font-mono uppercase focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-brand-taupe">Used when transparent over the hero.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-black">
                  Scrolled Nav Background
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.navbarScrolledBackground || '#FAFAFA'}
                    onChange={(e) => setForm({ ...form, navbarScrolledBackground: e.target.value })}
                    className="w-10 h-10 border border-brand-stone cursor-pointer p-0.5 bg-brand-white"
                  />
                  <input
                    type="text"
                    value={form.navbarScrolledBackground || ''}
                    onChange={(e) => setForm({ ...form, navbarScrolledBackground: e.target.value })}
                    className="flex-1 text-sm bg-brand-stone/20 border border-brand-stone px-3 py-2 font-mono uppercase focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-brand-taupe">Solid background when scrolled.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-black">
                  Scrolled Nav Foreground / Logo
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.navbarScrolledForeground || '#121212'}
                    onChange={(e) => setForm({ ...form, navbarScrolledForeground: e.target.value })}
                    className="w-10 h-10 border border-brand-stone cursor-pointer p-0.5 bg-brand-white"
                  />
                  <input
                    type="text"
                    value={form.navbarScrolledForeground || ''}
                    onChange={(e) => setForm({ ...form, navbarScrolledForeground: e.target.value })}
                    className="flex-1 text-sm bg-brand-stone/20 border border-brand-stone px-3 py-2 font-mono uppercase focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-brand-taupe">Links and logo color when scrolled.</p>
              </div>
            </div>
          </div>

          {/* Section 3: Lifestyle Editorial Cards */}
          <div className="bg-brand-white border border-brand-stone p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-display uppercase tracking-wider mb-6 pb-2 border-b border-brand-stone flex justify-between items-center">
              <span>3. Curated Lifestyle Cards</span>
              <span className="text-xs text-brand-taupe font-normal">
                Replaces Canvas Collection &amp; static features
              </span>
            </h2>

            <div className="space-y-6">
              {form.lifestyleCards?.map((card, index) => (
                <div
                  key={card.id || index}
                  className="border border-brand-stone p-5 bg-brand-stone/10 space-y-4"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-brand-stone/60">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold tracking-widest uppercase bg-brand-black text-brand-white px-2 py-0.5">
                        Card #{index + 1}
                      </span>
                      <span className="font-semibold text-sm uppercase">{card.title}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moveCard(index, 'up')}
                        disabled={index === 0}
                        aria-label="Move Card Up"
                        className="p-1 hover:bg-brand-stone/40 disabled:opacity-30"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCard(index, 'down')}
                        disabled={index === (form.lifestyleCards?.length || 0) - 1}
                        aria-label="Move Card Down"
                        className="p-1 hover:bg-brand-stone/40 disabled:opacity-30"
                      >
                        <ArrowDown size={16} />
                      </button>
                      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ml-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={card.isVisible !== false}
                          onChange={(e) => updateCard(index, { isVisible: e.target.checked })}
                          className="accent-brand-black"
                        />
                        Visible
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Title */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-black">
                        Card Title
                      </label>
                      <input
                        type="text"
                        value={card.title}
                        onChange={(e) => updateCard(index, { title: e.target.value })}
                        className="w-full text-sm bg-brand-white border border-brand-stone px-3 py-2 focus:outline-none focus:border-brand-black"
                      />
                    </div>

                    {/* Destination */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-black">
                        Destination Path
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={card.destination}
                          onChange={(e) => updateCard(index, { destination: e.target.value })}
                          placeholder="/shop?category=..."
                          className="flex-1 text-sm bg-brand-white border border-brand-stone px-3 py-2 focus:outline-none focus:border-brand-black"
                        />
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              updateCard(index, { destination: e.target.value });
                            }
                          }}
                          className="text-xs bg-brand-white border border-brand-stone px-2 py-2 focus:outline-none"
                        >
                          <option value="">Presets...</option>
                          {COMMON_DESTINATIONS.map((d) => (
                            <option key={d.value} value={d.value}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Caption */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-black">
                        Short Caption
                      </label>
                      <input
                        type="text"
                        value={card.caption}
                        onChange={(e) => updateCard(index, { caption: e.target.value })}
                        className="w-full text-sm bg-brand-white border border-brand-stone px-3 py-2 focus:outline-none focus:border-brand-black"
                      />
                    </div>

                    {/* Image URL & Upload */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-black">
                        Card Image
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={card.imageUrl}
                          onChange={(e) => updateCard(index, { imageUrl: e.target.value })}
                          placeholder="Image URL or Cloudinary URL"
                          className="flex-1 text-sm bg-brand-white border border-brand-stone px-3 py-2 focus:outline-none focus:border-brand-black"
                        />
                        <button
                          type="button"
                          onClick={() => handleOpenCloudinary(`card-${index}`, index)}
                          disabled={isUploading === `card-${index}`}
                          className="flex items-center gap-1.5 px-4 py-2 bg-brand-black text-brand-white text-xs font-semibold tracking-wider uppercase hover:bg-brand-taupe transition-colors"
                        >
                          <Upload size={14} /> {isUploading === `card-${index}` ? '...' : 'Upload'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Action Bar */}
          <div className="flex justify-end gap-4 pt-4 border-t border-brand-stone">
            <button
              type="button"
              onClick={() => {
                if (initialSettings) setForm(initialSettings);
              }}
              className="px-6 py-3 border border-brand-stone text-xs font-semibold tracking-widest uppercase hover:bg-brand-stone/30 transition-colors"
            >
              Reset Changes
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-8 py-3 bg-brand-black text-brand-white text-xs font-semibold tracking-widest uppercase hover:bg-brand-taupe transition-colors disabled:opacity-50"
            >
              <Save size={16} /> {mutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
