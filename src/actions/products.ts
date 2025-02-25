'use server';

import slugify from 'slugify';

import { createClient } from '@/supabase/server';
import {
  ProductsWithCategoriesResponse,
  UpdateProductSchema,
} from '@/app/admin/stock/products/products.types';
import { CreateProductSchemaServer } from '@/app/admin/stock/products/schema';
import { revalidatePath } from 'next/cache';

export const getProductsWithCategories =
  async (): Promise<ProductsWithCategoriesResponse> => {
    const supabase =  createClient();
    const { data, error } = await (await supabase)
      .from('product')
      .select('*, category:category(*)')
      .returns<ProductsWithCategoriesResponse>();

    if (error) {
      throw new Error(`
        Error fetching products with categories: ${error.message}`);
    }

    return data || [];
  };

export const createProduct = async ({
  category,
  maxQuantity,
  title,
}: CreateProductSchemaServer) => {
  const supabase =  createClient();
  const slug = slugify(title, { lower: true });

  const { data, error } = await (await supabase).from('product').insert({
    category,
    maxQuantity,
    slug,
    title,
  });

  if (error) {
    throw new Error(`Error creating product: ${error.message}`);
  }

  revalidatePath('/admin/products');

  return data;
};

export const updateProduct = async ({
  category,
  maxQuantity,
  slug,
  title,
}: UpdateProductSchema) => {
  const supabase =  createClient();
  const { data, error } = await (await supabase)
    .from('product')
    .update({
      category,
      maxQuantity,
      title,
    })
    .match({ slug });

  if (error) {
    throw new Error(`Error updating product: ${error.message}`);
  }

  revalidatePath('/admin/products');

  return data;
};

export const deleteProduct = async (slug: string) => {
  const supabase = createClient();
  const { error } = await (await supabase).from('product').delete().match({ slug });

  if (error) {
    throw new Error(`Error deleting product: ${error.message}`);
  }

  revalidatePath('/admin/products');
};
