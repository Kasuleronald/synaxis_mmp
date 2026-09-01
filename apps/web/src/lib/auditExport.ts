import { api } from "./api";

/** Fire-and-forget: an export succeeding for the user matters far more than
 * this log write succeeding, so a failure here never surfaces or blocks it. */
export function logExport(label: string) {
  api.post("/audit-log/export", { label }).catch(() => {});
}
