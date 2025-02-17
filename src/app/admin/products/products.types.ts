import { Category } from '@/app/admin/categories/categories.types';

export type ProductWithCategory = {
  category: Category;
  created_at: string;
  id: number;
  maxQuantity: number;
  price: number | null;
  slug: string;
  title: string;
};

export type ProductsWithCategoriesResponse = ProductWithCategory[];

export type UpdateProductSchema = {
  category: number;   
 maxQuantity: number;
  price: number;
  slug: string;
  title: string;
};
