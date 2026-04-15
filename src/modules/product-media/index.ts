import ProductMediaModuleService from "./service"
import { Module } from "@medusajs/framework/utils"
import ProductCategoryImage from "./models/product-category-image"
import ProductCollectionImage from "./models/product-collection-image"

export const PRODUCT_MEDIA_MODULE = "productMedia"

export default Module(PRODUCT_MEDIA_MODULE, {
  service: ProductMediaModuleService,
  models: [
    ProductCategoryImage,
    ProductCollectionImage,
  ],
} as any)