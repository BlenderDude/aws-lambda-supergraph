
export type ProductModel = {
  pk: string;
  sk: string;
  id: string;
  name: string;
  price: number;
}

export type PrimaryKey = Pick<ProductModel, "pk" | "sk">;
