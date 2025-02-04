import { Category } from "../categories/categories.types";

export type ProductWithCategory = {
    heroImage:string;
    id:number;
    imagesUrl: string;
    maxQuantity: number;
    price: number | null;
    slug:string;
    title:string;
    category:Category
};
export type ProductsWithCategoriesResponse = ProductWithCategory[];
export type UpdateProductSchema ={
    category: number;
    heroImage:string;
    imagesUrl: string;
    maxQuantity: number;
    price: number;
    slug: string;
    title: string;
}