import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { OrganizationDto, UpdateOrganizationInput } from "@life-mmp/shared";
import { api } from "../lib/api";
import { db } from "../lib/db";
import { useAuth } from "./AuthContext";

interface OrgState {
  org: OrganizationDto | null;
  loading: boolean;
  refresh: () => Promise<void>;
  update: (patch: UpdateOrganizationInput) => Promise<void>;
}

const OrgContext = createContext<OrgState | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [org, setOrg] = useState<OrganizationDto | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.organizationId) {
      setOrg(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<OrganizationDto>(`/organizations/${user.organizationId}`);
      setOrg(data);
      await db.organizations.put(data);
    } catch {
      const cached = await db.organizations.get(user.organizationId);
      if (cached) setOrg(cached);
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const update = useCallback(
    async (patch: UpdateOrganizationInput) => {
      if (!user?.organizationId) throw new Error("No organization to update");
      const updated = await api.patch<OrganizationDto>(`/organizations/${user.organizationId}`, patch);
      setOrg(updated);
      await db.organizations.put(updated);
    },
    [user?.organizationId],
  );

  return <OrgContext.Provider value={{ org, loading, refresh, update }}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used inside <OrgProvider>");
  return ctx;
}
