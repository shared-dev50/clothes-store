import prisma from '../config/db';

export const getAllCategoryNames = async () => {
  const categories = await prisma.category.findMany({
    select: { name: true },
    orderBy: { name: 'asc' },
  });
  
  return ['All', ...categories.map(c => c.name)];
};
