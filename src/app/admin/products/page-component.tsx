'use client';

import { FC, useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { v4 as uuid } from 'uuid';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { ProductsWithCategoriesResponse } from '@/app/admin/products/products.types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Category } from '@/app/admin/categories/categories.types';
import {
  createOrUpdateProductSchema,
  CreateOrUpdateProductSchema,
} from '@/app/admin/products/schema';
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from '@/actions/products';
import { ProductForm } from '@/app/admin/products/product-form';
import { ProductTableRow } from '@/app/admin/products/product-table-row';

type Props = {
  categories: Category[];
  productsWithCategories: ProductsWithCategoriesResponse;
};

export const ProductPageComponent: FC<Props> = ({
  categories,
  productsWithCategories,
}) => {
  const [currentProduct, setCurrentProduct] =
    useState<CreateOrUpdateProductSchema | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const form = useForm<CreateOrUpdateProductSchema>({
    resolver: zodResolver(createOrUpdateProductSchema),
    defaultValues: {
      title: '',
      category: undefined,
      price: undefined,
      maxQuantity: undefined,
      intent: 'create',
    },
  });

  const router = useRouter();

  const productCreateUpdateHandler = async (
    data: CreateOrUpdateProductSchema
  ) => {
    const {
      category,
      maxQuantity,
      price,
      title,
      slug,
      intent = 'create',
    } = data;

    switch (intent) {
      case 'create': {
        await createProduct({
          category: Number(category),
          maxQuantity: Number(maxQuantity),
          price: Number(price),
          title,
        });
        form.reset();
        router.refresh();
        setIsProductModalOpen(false);
        toast.success('Product created successfully');
        break;
      }
      case 'update': {
        if (slug) {
          await updateProduct({
            category: Number(category),
            maxQuantity: Number(maxQuantity),
            price: Number(price),
            title,
            slug,
          });
          form.reset();
          router.refresh();
          setIsProductModalOpen(false);
          toast.success('Product updated successfully');
        }
        break;
      }

      default:
        console.error('Invalid intent');
    }
  };

  const deleteProductHandler = async () => {
    if (currentProduct?.slug) {
      await deleteProduct(currentProduct.slug);
      router.refresh();
      toast.success('Product deleted successfully');
      setIsDeleteModalOpen(false);
      setCurrentProduct(null);
    }
  };

  return (
    <main className='grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8'>
      <div className='container mx-auto p-4'>
        <div className='flex justify-between items-center mb-4'>
          <h1 className='text-2xl font-bold'>Products Management</h1>
          <Button
            onClick={() => {
              setCurrentProduct(null);
              setIsProductModalOpen(true);
            }}
          >
            <PlusIcon className='mr-2 h-4 w-4' /> Add Product
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Available Quantity</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productsWithCategories.map(product => (
              <ProductTableRow
                setIsProductModalOpen={setIsProductModalOpen}
                key={product.id}
                product={product}
                setCurrentProduct={setCurrentProduct}
                setIsDeleteModalOpen={setIsDeleteModalOpen}
              />
            ))}
          </TableBody>
        </Table>

        {/* Product Modal */}
        <ProductForm
          form={form}
          onSubmit={productCreateUpdateHandler}
          categories={categories}
          isProductModalOpen={isProductModalOpen}
          setIsProductModalOpen={setIsProductModalOpen}
          defaultValues={currentProduct}
        />

        {/* Delete Product Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to delete {currentProduct?.title}</p>
            <DialogFooter>
              <Button variant='destructive' onClick={deleteProductHandler}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
};
