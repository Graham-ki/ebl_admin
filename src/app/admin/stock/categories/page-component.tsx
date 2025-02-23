'use client'
import { FC, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { PlusCircle } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { CategoryTableRow } from '@/components/category';
import {
  createCategorySchema,
  CreateCategorySchema,
} from '@/app/admin/stock/categories/create-category.schema';
import { CategoriesWithProductsResponse } from '@/app/admin/stock/categories/categories.types';
import { CategoryForm } from '@/app/admin/stock/categories/category-form';
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from '@/actions/categories';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Props = {
  categories: CategoriesWithProductsResponse;
};

const CategoriesPageComponent: FC<Props> = ({ categories }) => {
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] =
    useState(false);
  const [currentCategory, setCurrentCategory] =
    useState<CreateCategorySchema | null>(null);

  const form = useForm<CreateCategorySchema>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: '',
    },
  });

  const router = useRouter();

  const submitCategoryHandler: SubmitHandler<CreateCategorySchema> = async data => {
    const { name, intent = 'create' } = data;

    switch (intent) {
      case 'create': {
        await createCategory({ name });
        form.reset();
        router.refresh();
        setIsCreateCategoryModalOpen(false);
        toast.success('Category created successfully');
        break;
      }
      case 'update': {
        if (currentCategory?.slug) {
          await updateCategory({
            name,
            slug: currentCategory.slug,
            intent: 'update',
          });
          form.reset();
          router.refresh();
          setIsCreateCategoryModalOpen(false);
          toast.success('Category updated successfully');
        }
        break;
      }
      default:
        console.error('Invalid intent');
    }
  };

  const deleteCategoryHandler = async (id: number) => {
    await deleteCategory(id);
    router.refresh();
    toast.success('Category deleted successfully');
  };

  return (
    <main className='grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8'>
      <div className='flex items-center my-10'>
        <h1 className='text-3xl font-bold mb-6 text-center shadow-lg p-4 rounded-lg bg-blue-100 dark:bg-gray-800 dark:text-white'>Categories Management</h1>
        <div className='ml-auto flex items-center gap-2'>
          <Dialog
            open={isCreateCategoryModalOpen}
            onOpenChange={() =>
              setIsCreateCategoryModalOpen(!isCreateCategoryModalOpen)
            }
          >
            <DialogTrigger asChild>
              <Button
                size='sm'
                className='h-8 gap-1'
                onClick={() => {
                  setCurrentCategory(null);
                  setIsCreateCategoryModalOpen(true);
                }}
              >
                <PlusCircle className='h-3.5 w-3.5' />
                <span className='sr-only sm:not-sr-only sm:whitespace-nowrap'>
                  Add Category
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent className='dialog'>
              <DialogHeader>
                <DialogTitle>Create Category</DialogTitle>
              </DialogHeader>
              <CategoryForm
                form={form}
                onSubmit={submitCategoryHandler}
                defaultValues={currentCategory}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className='overflow-x-auto card'>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>

        <CardContent>
          <Table className='min-w-[600px]'>
            <TableHeader>
              <TableRow>
                <TableHead className='shadow-lg'>Name</TableHead>
                <TableHead className='md:table-cell shadow-lg'>Created at</TableHead>
                <TableHead className='md:table-cell shadow-lg'>Products</TableHead>
                <TableHead className='shadow-lg'>
                  <span className='sr-only'>Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map(category => (
                <CategoryTableRow
                  key={category.id}
                  category={category}
                  setCurrentCategory={setCurrentCategory}
                  setIsCreateCategoryModalOpen={setIsCreateCategoryModalOpen}
                  deleteCategoryHandler={deleteCategoryHandler}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
};

export default CategoriesPageComponent;
