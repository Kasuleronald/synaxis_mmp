import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { SessionUser } from "@life-mmp/shared";
import { AUDIT_KEY, AuditMeta } from "./audit.decorator";
import { AuditLogService } from "./audit-log.service";

const DEFAULT_LABEL_FIELDS = ["entityLabel", "fullName", "name", "displayName", "title"];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLog: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta | undefined>(AUDIT_KEY, context.getHandler());
    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest();
    const user = req.user as SessionUser | undefined;

    return next.handle().pipe(
      tap((result) => {
        if (!user) return;
        const body = result && typeof result === "object" ? (result as Record<string, unknown>) : {};
        const entityId = (typeof body.entityId === "string" && body.entityId) || (typeof body.id === "string" && body.id) || req.params?.id;
        const entityLabel = pickLabel(body, meta.labelFields);
        // Auditing must never break the actual request -- a failed write
        // here is a thing to notice in logs, not a reason to fail an
        // otherwise-successful mutation the user is waiting on.
        this.auditLog
          .record(user, { action: meta.action, entityType: meta.entityType, entityId, entityLabel })
          .catch(() => {});
      }),
    );
  }
}

function pickLabel(body: Record<string, unknown>, fields?: string[]): string | undefined {
  for (const f of fields ?? DEFAULT_LABEL_FIELDS) {
    const v = body[f];
    if (typeof v === "string" && v) return v;
  }
  return undefined;
}
