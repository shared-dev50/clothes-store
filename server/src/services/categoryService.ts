import prisma from '../config/db';

export const getAllCategoryNames = async () => {
  const rootCategories = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      children: {
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });
  
  const names: string[] = [];
  for (const root of rootCategories) {
    names.push(root.name);
    for (const child of root.children) {
      names.push(child.name);
    }
  }
  
  return names;
};
