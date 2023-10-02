import { UserRepository } from "./repositories/User.repository";

export type ResolverContext = {
  repositories: {
    user: UserRepository;
  };
  session: {
    userId: string | null;
  };
};
