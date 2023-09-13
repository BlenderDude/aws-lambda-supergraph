import { Session, SessionManager } from "@app/shared";
import { UserRepository } from "./repositories/User.repository";

export type ResolverContext = {
  repositories: {
    user: UserRepository;
  },
  services: {
    session: SessionManager;
  };
  session: Session | null;
}