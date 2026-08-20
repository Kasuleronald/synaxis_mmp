import { SessionUser } from "@life-mmp/shared";

// Passport types req.user as the empty Express.User interface by default.
// Merging our real session shape in means req.user is SessionUser
// everywhere, not `any`, without a cast at every call site.
declare global {
  namespace Express {
    interface User extends SessionUser {}
  }
}

export {};
