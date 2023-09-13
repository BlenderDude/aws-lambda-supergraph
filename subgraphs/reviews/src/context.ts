import { ReviewRepository } from "./repositories/Review.repository";
import { Session } from "@app/shared";

export type ResolverContext = {
  repositories: {
    review: ReviewRepository;
  };
  session: Session | null;
};
