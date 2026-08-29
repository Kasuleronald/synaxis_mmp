import { SetMetadata } from "@nestjs/common";

export const AUDIT_KEY = "audit";

export interface AuditMeta {
  action: string;
  entityType: string;
  /** Response-body fields tried in order for the human-readable label --
   * defaults cover the common cases (a member/fund/vendor's own name field,
   * a request's own entityLabel snapshot). */
  labelFields?: string[];
}

/** Marks a controller route as audit-worthy; AuditInterceptor reads this via
 * Reflector and writes one row after the handler succeeds. Only for
 * mutations (create/update/delete/approve/reject) -- reads are never
 * audited. */
export const Audit = (meta: AuditMeta) => SetMetadata(AUDIT_KEY, meta);
