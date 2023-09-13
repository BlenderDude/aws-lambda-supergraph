import { ProductRepository } from "./repositories/Product.repository";
import { Session } from "@app/shared";

export type ResolverContext = {
  repositories: {
    product: ProductRepository;
  };
  session: Session | null;
}