import { ProductRepository } from "./repositories/Product.repository";

export type ResolverContext = {
  repositories: {
    product: ProductRepository;
  };
  session: {
    userId: string | null;
  };
};
