import { ReviewRepository } from "./repositories/Review.repository";

export type ResolverContext = {
  repositories: {
    review: ReviewRepository;
  };
  session: {
    userId: string | null;
  };
};
