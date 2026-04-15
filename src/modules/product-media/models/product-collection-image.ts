import { model } from "@medusajs/framework/utils"

const ProductCollectionImage = model.define("product_collection_image", {
  id: model.id().primaryKey(),
  url: model.text(),
  file_id: model.text(),
  type: model.enum(["thumbnail", "image"]),
  collection_id: model.text(),
})
  .indexes([
    {
      on: ["collection_id", "type"],
      where: "type = 'thumbnail'",
      unique: true,
      name: "unique_thumbnail_per_collection",
    },
  ])

export default ProductCollectionImage