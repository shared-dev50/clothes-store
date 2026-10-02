import { Request, Response } from 'express';
import prisma from '../config/db';

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

      // 2. Delete existing images & variants
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.productVariant.deleteMany({ where: { productId: id } });

      // 3. Recreate images & variants
      if (images && images.length > 0) {
        await tx.productImage.createMany({
          data: images.map((url: string, index: number) => ({
            productId: id,
            imageUrl: url,
            displayOrder: index,
          })),
        });
      }

      if (variants && variants.length > 0) {
        await tx.productVariant.createMany({
          data: variants.map((v: any) => ({
            productId: id,
            color: v.color,
            colorHex: v.colorHex,
            size: v.size,
            stock: Number(v.stock),
            sku: v.sku,
          })),
        });
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
