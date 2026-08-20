import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { SubmitRegistrationDto } from "./dto/submit-registration.dto";
import { RegistrationsService } from "./registrations.service";

/** Deliberately unauthenticated -- a visitor filling this out has no
 * account. Access is the org's own slug, already public (it's in every
 * church's URL); the RLS carve-out this relies on only ever widens a
 * lookup by that exact slug, never a listing (see the self_registration
 * migration). */
@Controller("register")
export class RegisterController {
  constructor(private readonly registrations: RegistrationsService) {}

  @Get(":slug")
  info(@Param("slug") slug: string) {
    return this.registrations.getPublicOrgInfo(slug);
  }

  @Post(":slug")
  submit(@Param("slug") slug: string, @Body() dto: SubmitRegistrationDto) {
    return this.registrations.submit(slug, dto);
  }
}
