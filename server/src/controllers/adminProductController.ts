import { Request, Response } from 'express';
import prisma from '../config/db';
import crypto from 'crypto';

const generateSKUsForVariants = async (productName: string, variants: any[], tx: any = prisma) => {
  const generatedSKUs = new Set<string>();
  
  for (const v of variants) {
    if (v.sku && v.sku.trim() !== '') {
      generatedSKUs.add(v.sku);
      continue;
    }
    
    const prefix = productName.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X') || 'PRD';
    const colorPart = v.color ? v.color.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X') : 'DEF';
    const sizePart = v.size ? v.size.toUpperCase().replace(/[^A-Z0-9]/g, 'X') : 'NA';
    
    let attempts = 0;
    let newSku = '';
    while (attempts < 5) {
      const uniqueId = crypto.randomBytes(2).toString('hex').toUpperCase();
      newSku = `${prefix}-${colorPart}-${sizePart}-${uniqueId}`;
      
      if (generatedSKUs.has(newSku)) {
        attempts++;
        continue;
      }
      
      const existing = await tx.productVariant.findUnique({ where: { sku: newSku } });
      if (!existing) {
        break;
      }
      attempts++;
    }
    
    if (attempts >= 5) {
      throw new Error(`Failed to generate a unique SKU for variant ${v.color || 'Unknown'} ${v.size || 'Unknown'}`);
    }
    
    v.sku = newSku;
    generatedSKUs.add(newSku);
  }
};

const generateSlug = (name: string) => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

export const getAdminCategories = async (req: Request, res: Response) => {
  try {
    const rootCategories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(rootCategories);
  } catch (error) {
    console.error('Error fetching admin categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

export const getAdminProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        images: true,
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (error) {
    console.error('Error fetching admin products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const getAdminProductById = async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id as string },
      include: {
        category: true,
        images: { orderBy: { displayOrder: 'asc' } },
        variants: true,
      },
    });
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(product);
  } catch (error) {
    console.error('Error fetching admin product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, description, details, price, categoryId, featured, newArrival, images, variants } = req.body;

    const slug = generateSlug(name);
    
    // Check if slug exists
    const existing = await prisma.product.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    try {
      await generateSKUsForVariants(name, variants, prisma);
    } catch (skuError: any) {
      res.status(400).json({ error: skuError.message });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug: finalSlug,
        description,
        details: details || [],
        price,
        categoryId,
        featured: featured || false,
        newArrival: newArrival || false,
        images: {
          create: images.map((url: string, index: number) => ({
            imageUrl: url,
            displayOrder: index,
          })),
        },
        variants: {
          create: variants.map((v: any) => ({
            color: v.color,
            colorHex: v.colorHex,
            size: v.size,
            stock: Number(v.stock),
            sku: v.sku,
          })),
        },
      },
      include: {
        category: true,
        images: true,
        variants: true,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, description, details, price, categoryId, featured, newArrival, images, variants } = req.body;

    let slug = generateSlug(name);
    
    // Check if slug exists for OTHER products
    const existing = await prisma.product.findFirst({
      where: { slug, id: { not: id } },
    });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    // Use transaction to update product, delete old images/variants, and recreate them
    const product = await prisma.$transaction(async (tx) => {
      await generateSKUsForVariants(name, variants, tx);

      // 1. Update basic product info
      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          name,
          slug,
          description,
          details: details || [],
          price,
          categoryId,
          featured: featured || false,
          newArrival: newArrival || false,
        },
      });

      // 2. Recreate images (safe to delete as they have no other relations)
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (images && images.length > 0) {
        await tx.productImage.createMany({
          data: images.map((url: string, index: number) => ({
            productId: id,
            imageUrl: url,
            displayOrder: index,
          })),
        });
      }

      // 3. Reconcile variants
      const existingVariants = await tx.productVariant.findMany({ where: { productId: id } });
      const existingVariantIds = existingVariants.map(v => v.id);

      const variantsToKeep = variants.filter((v: any) => v.id);
      const variantIdsToKeep = variantsToKeep.map((v: any) => v.id);

      // Validate submitted variant IDs
      for (const vId of variantIdsToKeep) {
        if (!existingVariantIds.includes(vId)) {
          throw new Error(`Variant ID ${vId} does not belong to this product or is invalid.`);
        }
      }

      const variantsToDelete = existingVariants.filter(v => !variantIdsToKeep.includes(v.id));
      const variantsToCreate = variants.filter((v: any) => !v.id);

      // Delete or deactivate removed variants
      for (const v of variantsToDelete) {
        const orderItems = await tx.orderItem.findFirst({ where: { variantId: v.id } });
        if (orderItems) {
          // Cannot delete because it's referenced by order items.
          // Archive it instead.
          await tx.productVariant.update({
            where: { id: v.id },
            data: { isArchived: true }
          });
        } else {
          await tx.productVariant.delete({ where: { id: v.id } });
        }
      }

      // Update kept variants
      for (const v of variantsToKeep) {
        await tx.productVariant.update({
          where: { id: v.id },
          data: {
            color: v.color,
            colorHex: v.colorHex,
            size: v.size,
            stock: Number(v.stock),
            sku: v.sku,
            isArchived: v.isArchived || false,
          }
        });
      }

      // Create new variants, handling potential resurrected variants
      for (const v of variantsToCreate) {
        const existingArchived = await tx.productVariant.findUnique({
          where: {
            productId_color_size: {
              productId: id,
              color: v.color || null,
              size: v.size || null
            }
          }
        });

        if (existingArchived) {
          await tx.productVariant.update({
            where: { id: existingArchived.id },
            data: {
              colorHex: v.colorHex,
              stock: Number(v.stock),
              isArchived: false
            }
          });
        } else {
          await tx.productVariant.create({
            data: {
              productId: id,
              color: v.color,
              colorHex: v.colorHex,
              size: v.size,
              stock: Number(v.stock),
              sku: v.sku,
              isArchived: false,
            }
          });
        }
      }

      // Fetch final updated record
      return tx.product.findUnique({
        where: { id },
        include: {
          category: true,
          images: { orderBy: { displayOrder: 'asc' } },
          variants: true,
        },
      });
    });

    res.json(product);
  } catch (error: any) {
    console.error('Error updating product:', error);
    if (error.message && (error.message.includes('Failed to generate a unique SKU') || error.message.includes('does not belong to this product'))) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error.code === 'P2003') {
      res.status(400).json({ error: 'Cannot modify variants because this product has existing orders. Please archive the product instead.' });
      return;
    }
    res.status(500).json({ error: 'Failed to update product' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    // Check if referenced by order items
    const orderItems = await prisma.orderItem.findFirst({
      where: { productId: id }
    });
    
    if (orderItems) {
      // Archive instead
      await prisma.product.update({
        where: { id },
        data: { isArchived: true, isActive: false }
      });
      res.status(200).json({ message: 'Product has orders and was archived instead of deleted.' });
      return;
    }
    
    await prisma.product.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};
