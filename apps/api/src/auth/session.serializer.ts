import { Injectable } from "@nestjs/common";
import { PassportSerializer } from "@nestjs/passport";
import { SessionUser } from "@life-mmp/shared";
import { AuthService } from "./auth.service";

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly authService: AuthService) {
    super();
  }

  serializeUser(user: SessionUser, done: (err: Error | null, id?: string) => void) {
    done(null, user.id);
  }

  async deserializeUser(id: string, done: (err: Error | null, user?: SessionUser | null) => void) {
    const user = await this.authService.findById(id);
    done(null, user);
  }
}
