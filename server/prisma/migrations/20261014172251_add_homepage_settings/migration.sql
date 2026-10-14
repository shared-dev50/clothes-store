-- CreateTable
CREATE TABLE "homepage_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "heroHeading" TEXT NOT NULL DEFAULT 'Modern
Heritage.',
    "heroCaption" TEXT NOT NULL DEFAULT 'Introducing Collection 01. Minimalist contemporary silhouettes crafted with a Kenyan soul.',
    "heroCtaLabel" TEXT NOT NULL DEFAULT 'Shop Collection',
    "heroCtaLink" TEXT NOT NULL DEFAULT '/shop',
    "heroCtaSecondaryLabel" TEXT DEFAULT 'New Arrivals',
    "heroCtaSecondaryLink" TEXT DEFAULT '/shop?category=new',
    "heroImageUrl" TEXT,
    "heroMobileImageUrl" TEXT,
    "navbarTransparentForeground" TEXT NOT NULL DEFAULT '#FAFAFA',
    "navbarScrolledBackground" TEXT NOT NULL DEFAULT '#FAFAFA',
    "navbarScrolledForeground" TEXT NOT NULL DEFAULT '#121212',
    "lifestyleCards" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_settings_pkey" PRIMARY KEY ("id")
);
