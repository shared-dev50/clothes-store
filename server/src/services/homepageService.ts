import prisma from '../config/db';

export interface LifestyleCardItem {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  destination: string;
  isVisible: boolean;
  order: number;
}

export interface HomepageSettingsDTO {
  id: string;
  heroHeading: string;
  heroCaption: string;
  heroCtaLabel: string;
  heroCtaLink: string;
  heroCtaSecondaryLabel: string | null;
  heroCtaSecondaryLink: string | null;
  heroImageUrl: string | null;
  heroMobileImageUrl: string | null;
  navbarTransparentForeground: string;
  navbarScrolledBackground: string;
  navbarScrolledForeground: string;
  lifestyleCards: LifestyleCardItem[];
  updatedAt?: string;
}

export const DEFAULT_HOMEPAGE_SETTINGS: HomepageSettingsDTO = {
  id: 'default',
  heroHeading: 'Modern\nHeritage.',
  heroCaption: 'Introducing Collection 01. Minimalist contemporary silhouettes crafted with a Kenyan soul.',
  heroCtaLabel: 'Shop Collection',
  heroCtaLink: '/shop',
  heroCtaSecondaryLabel: 'New Arrivals',
  heroCtaSecondaryLink: '/shop?category=new',
  heroImageUrl: null,
  heroMobileImageUrl: null,
  navbarTransparentForeground: '#FAFAFA',
  navbarScrolledBackground: '#FAFAFA',
  navbarScrolledForeground: '#121212',
  lifestyleCards: [
    {
      id: 'wellness',
      title: 'Wellness',
      caption: 'Everyday essentials for your self-care routine.',
      imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1200&auto=format&fit=crop',
      destination: '/shop?category=Wellness',
      isVisible: true,
      order: 1,
    },
    {
      id: 'weight-management',
      title: 'Weight Management',
      caption: 'Explore products for your personal wellness journey.',
      imageUrl: 'https://images.unsplash.com/photo-1596344084757-b83f2081da8b?q=80&w=1200&auto=format&fit=crop',
      destination: '/shop?category=Weight Management',
      isVisible: true,
      order: 2,
    },
    {
      id: 'wigs-hair',
      title: 'Wigs & Hair',
      caption: 'Find your look. Make it yours.',
      imageUrl: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?q=80&w=1200&auto=format&fit=crop',
      destination: '/shop?category=Wigs & Hair',
      isVisible: true,
      order: 3,
    },
  ],
};

const isValidHexColor = (color: string): boolean => {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color.trim());
};

const isValidInternalDestination = (dest: string): boolean => {
  if (typeof dest !== 'string') return false;
  const trimmed = dest.trim();
  // Must start with single '/', must not start with '//' (protocol relative), no javascript/http open redirects
  return trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.toLowerCase().includes('javascript:');
};

const isValidImageUrl = (url: string | null | undefined): boolean => {
  if (!url) return true;
  const trimmed = url.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return !trimmed.toLowerCase().includes('javascript:') && !trimmed.toLowerCase().includes('data:');
  }
  return false;
};

export const getHomepageSettings = async (): Promise<HomepageSettingsDTO> => {
  try {
    const settings = await prisma.homepageSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      return DEFAULT_HOMEPAGE_SETTINGS;
    }

    let parsedCards: LifestyleCardItem[] = DEFAULT_HOMEPAGE_SETTINGS.lifestyleCards;
    if (settings.lifestyleCards) {
      try {
        const raw = settings.lifestyleCards as unknown as LifestyleCardItem[];
        if (Array.isArray(raw) && raw.length > 0) {
          parsedCards = raw.sort((a, b) => a.order - b.order);
        }
      } catch (e) {
        console.error('Failed to parse lifestyle cards from DB settings:', e);
      }
    }

    return {
      id: settings.id,
      heroHeading: settings.heroHeading || DEFAULT_HOMEPAGE_SETTINGS.heroHeading,
      heroCaption: settings.heroCaption || DEFAULT_HOMEPAGE_SETTINGS.heroCaption,
      heroCtaLabel: settings.heroCtaLabel || DEFAULT_HOMEPAGE_SETTINGS.heroCtaLabel,
      heroCtaLink: settings.heroCtaLink || DEFAULT_HOMEPAGE_SETTINGS.heroCtaLink,
      heroCtaSecondaryLabel: settings.heroCtaSecondaryLabel,
      heroCtaSecondaryLink: settings.heroCtaSecondaryLink,
      heroImageUrl: settings.heroImageUrl,
      heroMobileImageUrl: settings.heroMobileImageUrl,
      navbarTransparentForeground: settings.navbarTransparentForeground || DEFAULT_HOMEPAGE_SETTINGS.navbarTransparentForeground,
      navbarScrolledBackground: settings.navbarScrolledBackground || DEFAULT_HOMEPAGE_SETTINGS.navbarScrolledBackground,
      navbarScrolledForeground: settings.navbarScrolledForeground || DEFAULT_HOMEPAGE_SETTINGS.navbarScrolledForeground,
      lifestyleCards: parsedCards,
      updatedAt: settings.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error('Error fetching homepage settings from DB, falling back to defaults:', error);
    return DEFAULT_HOMEPAGE_SETTINGS;
  }
};

export const updateHomepageSettings = async (data: Partial<HomepageSettingsDTO>): Promise<HomepageSettingsDTO> => {
  // Validation
  if (data.heroHeading !== undefined) {
    if (typeof data.heroHeading !== 'string' || data.heroHeading.trim().length === 0 || data.heroHeading.length > 150) {
      throw new Error('Hero headline is required and must not exceed 150 characters.');
    }
  }

  if (data.heroCaption !== undefined) {
    if (typeof data.heroCaption !== 'string' || data.heroCaption.length > 400) {
      throw new Error('Hero caption must not exceed 400 characters.');
    }
  }

  if (data.heroCtaLabel !== undefined) {
    if (typeof data.heroCtaLabel !== 'string' || data.heroCtaLabel.trim().length === 0 || data.heroCtaLabel.length > 60) {
      throw new Error('Hero CTA label is required and must not exceed 60 characters.');
    }
  }

  if (data.heroCtaLink !== undefined) {
    if (!isValidInternalDestination(data.heroCtaLink)) {
      throw new Error('Hero CTA destination must be a valid internal path starting with "/"');
    }
  }

  if (data.heroCtaSecondaryLabel) {
    if (typeof data.heroCtaSecondaryLabel !== 'string' || data.heroCtaSecondaryLabel.length > 60) {
      throw new Error('Secondary CTA label must not exceed 60 characters.');
    }
  }

  if (data.heroCtaSecondaryLink) {
    if (!isValidInternalDestination(data.heroCtaSecondaryLink)) {
      throw new Error('Secondary CTA destination must be a valid internal path starting with "/"');
    }
  }

  if (data.heroImageUrl !== undefined && !isValidImageUrl(data.heroImageUrl)) {
    throw new Error('Hero image must be a valid HTTP/HTTPS URL or internal asset path.');
  }

  if (data.heroMobileImageUrl !== undefined && !isValidImageUrl(data.heroMobileImageUrl)) {
    throw new Error('Hero mobile image must be a valid HTTP/HTTPS URL or internal asset path.');
  }

  if (data.navbarTransparentForeground !== undefined) {
    if (!isValidHexColor(data.navbarTransparentForeground)) {
      throw new Error('Transparent navbar foreground must be a valid hex color code (e.g. #FAFAFA).');
    }
  }

  if (data.navbarScrolledBackground !== undefined) {
    if (!isValidHexColor(data.navbarScrolledBackground)) {
      throw new Error('Scrolled navbar background must be a valid hex color code (e.g. #FAFAFA).');
    }
  }

  if (data.navbarScrolledForeground !== undefined) {
    if (!isValidHexColor(data.navbarScrolledForeground)) {
      throw new Error('Scrolled navbar foreground must be a valid hex color code (e.g. #121212).');
    }
  }

  let sanitizedCards: LifestyleCardItem[] | undefined = undefined;
  if (data.lifestyleCards !== undefined) {
    if (!Array.isArray(data.lifestyleCards)) {
      throw new Error('Lifestyle cards must be an array.');
    }
    if (data.lifestyleCards.length > 10) {
      throw new Error('Maximum 10 lifestyle cards allowed.');
    }

    sanitizedCards = data.lifestyleCards.map((card, idx) => {
      if (!card.title || typeof card.title !== 'string' || card.title.length > 80) {
        throw new Error(`Lifestyle card ${idx + 1}: Title is required (max 80 chars).`);
      }
      if (!card.caption || typeof card.caption !== 'string' || card.caption.length > 300) {
        throw new Error(`Lifestyle card ${idx + 1}: Caption is required (max 300 chars).`);
      }
      if (!isValidInternalDestination(card.destination)) {
        throw new Error(`Lifestyle card ${idx + 1}: Destination must be a valid internal path starting with "/".`);
      }
      if (!isValidImageUrl(card.imageUrl)) {
        throw new Error(`Lifestyle card ${idx + 1}: Image URL must be valid.`);
      }

      return {
        id: card.id || `card-${idx}`,
        title: card.title.trim(),
        caption: card.caption.trim(),
        imageUrl: card.imageUrl.trim(),
        destination: card.destination.trim(),
        isVisible: typeof card.isVisible === 'boolean' ? card.isVisible : true,
        order: typeof card.order === 'number' ? card.order : idx + 1,
      };
    });
  }

  const upserted = await prisma.homepageSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      heroHeading: data.heroHeading ?? DEFAULT_HOMEPAGE_SETTINGS.heroHeading,
      heroCaption: data.heroCaption ?? DEFAULT_HOMEPAGE_SETTINGS.heroCaption,
      heroCtaLabel: data.heroCtaLabel ?? DEFAULT_HOMEPAGE_SETTINGS.heroCtaLabel,
      heroCtaLink: data.heroCtaLink ?? DEFAULT_HOMEPAGE_SETTINGS.heroCtaLink,
      heroCtaSecondaryLabel: data.heroCtaSecondaryLabel ?? DEFAULT_HOMEPAGE_SETTINGS.heroCtaSecondaryLabel,
      heroCtaSecondaryLink: data.heroCtaSecondaryLink ?? DEFAULT_HOMEPAGE_SETTINGS.heroCtaSecondaryLink,
      heroImageUrl: data.heroImageUrl ?? null,
      heroMobileImageUrl: data.heroMobileImageUrl ?? null,
      navbarTransparentForeground: data.navbarTransparentForeground ?? DEFAULT_HOMEPAGE_SETTINGS.navbarTransparentForeground,
      navbarScrolledBackground: data.navbarScrolledBackground ?? DEFAULT_HOMEPAGE_SETTINGS.navbarScrolledBackground,
      navbarScrolledForeground: data.navbarScrolledForeground ?? DEFAULT_HOMEPAGE_SETTINGS.navbarScrolledForeground,
      lifestyleCards: sanitizedCards ? (sanitizedCards as any) : (DEFAULT_HOMEPAGE_SETTINGS.lifestyleCards as any),
    },
    update: {
      ...(data.heroHeading !== undefined ? { heroHeading: data.heroHeading.trim() } : {}),
      ...(data.heroCaption !== undefined ? { heroCaption: data.heroCaption.trim() } : {}),
      ...(data.heroCtaLabel !== undefined ? { heroCtaLabel: data.heroCtaLabel.trim() } : {}),
      ...(data.heroCtaLink !== undefined ? { heroCtaLink: data.heroCtaLink.trim() } : {}),
      ...(data.heroCtaSecondaryLabel !== undefined ? { heroCtaSecondaryLabel: data.heroCtaSecondaryLabel?.trim() || null } : {}),
      ...(data.heroCtaSecondaryLink !== undefined ? { heroCtaSecondaryLink: data.heroCtaSecondaryLink?.trim() || null } : {}),
      ...(data.heroImageUrl !== undefined ? { heroImageUrl: data.heroImageUrl?.trim() || null } : {}),
      ...(data.heroMobileImageUrl !== undefined ? { heroMobileImageUrl: data.heroMobileImageUrl?.trim() || null } : {}),
      ...(data.navbarTransparentForeground !== undefined ? { navbarTransparentForeground: data.navbarTransparentForeground.trim() } : {}),
      ...(data.navbarScrolledBackground !== undefined ? { navbarScrolledBackground: data.navbarScrolledBackground.trim() } : {}),
      ...(data.navbarScrolledForeground !== undefined ? { navbarScrolledForeground: data.navbarScrolledForeground.trim() } : {}),
      ...(sanitizedCards !== undefined ? { lifestyleCards: sanitizedCards as any } : {}),
    },
  });

  return getHomepageSettings();
};
