import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Role } from "@life-mmp/shared";
import { useAuth } from "../context/AuthContext";
import { useOrg } from "../context/OrgContext";
import { useTerminology } from "../hooks/useTerminology";
import { ModeToggle } from "./ModeToggle";
import { SyncStatus } from "./SyncStatus";
import { NotificationBell } from "./NotificationBell";
import { Logo } from "./Logo";
import { Avatar } from "./Avatar";
import { CommandPalette } from "./CommandPalette";

interface NavItem {
  label: string;
  to?: string; // omitted = not built yet, ships in a later sprint
}

type IconComponent = () => JSX.Element;

function PeopleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function MinistryIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  );
}

function DiscipleshipIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

function FinanceIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function OperationsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94Z" />
    </svg>
  );
}

function CommunicationsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function SetupIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

// A function, not a static constant: the four core-noun labels are
// org-customizable (Settings > Terminology), so the nav has to rebuild
// against the active org's terms rather than hardcode the English default.
function buildNavGroups(
  terms: ReturnType<typeof useTerminology>,
): { label: string; icon: IconComponent; items: NavItem[] }[] {
  return [
    {
      label: "People",
      icon: PeopleIcon,
      items: [
        { label: terms.member, to: "/members" },
        { label: terms.household, to: "/households" },
        { label: "Follow-up", to: "/follow-ups" },
        { label: "Soul Winning", to: "/soul-winning" },
        { label: "Import Center", to: "/imports" },
        { label: "Registrations", to: "/registrations" },
      ],
    },
    {
      label: "Ministry",
      icon: MinistryIcon,
      items: [
        { label: "Events", to: "/events" },
        { label: terms.fellowship, to: "/fellowships" },
        { label: `${terms.fellowship} reports`, to: "/fellowships/reports" },
        { label: terms.department, to: "/departments" },
        { label: "Service Units", to: "/service-units" },
      ],
    },
    {
      label: "Trainings",
      icon: DiscipleshipIcon,
      items: [
        { label: "Programs", to: "/discipleship/programs" },
        { label: "Classes & Discipleship", to: "/discipleship/classes" },
      ],
    },
    {
      label: "Finance",
      icon: FinanceIcon,
      items: [
        { label: "Giving", to: "/giving" },
        { label: "Funds", to: "/finance/funds" },
        { label: "Pledges", to: "/finance/pledges" },
        { label: "Partners", to: "/finance/partners" },
        { label: "Batches", to: "/finance/batches" },
        { label: "Requisitions", to: "/finance/requisitions" },
        { label: "Accounting", to: "/finance/accounting" },
        { label: "Financial Settings", to: "/finance/settings" },
      ],
    },
    {
      label: "Operations",
      icon: OperationsIcon,
      items: [
        { label: "Attendance", to: "/attendance" },
        { label: "Assets", to: "/assets" },
        { label: "Fixed Assets", to: "/fixed-assets" },
        { label: "Deletion requests", to: "/deletion-requests" },
      ],
    },
    {
      label: "Communications",
      icon: CommunicationsIcon,
      items: [
        { label: "Announcements", to: "/announcements" },
        { label: "Testimonies", to: "/testimonies" },
        { label: terms.devotional, to: "/devotional" },
      ],
    },
    { label: "Reports", icon: ReportsIcon, items: [{ label: "Analytics", to: "/reports" }] },
  ];
}

const SETUP_GROUP: { label: string; icon: IconComponent; items: NavItem[] } = {
  label: "Setup",
  icon: SetupIcon,
  items: [
    { label: "Organization Admin", to: "/admin" },
    { label: "Settings", to: "/admin/settings" },
  ],
};

// Every registered route, flattened -- used to find the single most-specific
// match. Plain prefix matching breaks the moment one item's `to` is itself a
// prefix of another's (e.g. "/admin" vs "/admin/settings": both would
// highlight on the settings page). Picking the *longest* matching `to`
// resolves that ambiguity while still letting a detail route like
// "/attendance/:id" highlight its parent "Attendance" item, since no more
// specific nav entry exists for it.
// Path-matching only cares about `to`, never `label` -- placeholder terms
// are fine here, this never renders.
const ALL_NAV_PATHS: string[] = [
  "/",
  ...buildNavGroups({ member: "", household: "", fellowship: "", department: "", devotional: "" }).flatMap((g) =>
    g.items.map((i) => i.to).filter((to): to is string => !!to),
  ),
  ...SETUP_GROUP.items.map((i) => i.to).filter((to): to is string => !!to),
];

function useActiveNavPath(): string | null {
  const location = useLocation();
  const matches = ALL_NAV_PATHS.filter(
    (to) => location.pathname === to || location.pathname.startsWith(`${to}/`),
  );
  if (matches.length === 0) return null;
  return matches.reduce((best, cur) => (cur.length > best.length ? cur : best));
}

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

function CollapseToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms ease" }}
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 120ms ease" }}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function NavGroup({
  label,
  icon: Icon,
  items,
  collapsed,
  onExpandSidebar,
}: {
  label: string;
  icon: IconComponent;
  items: NavItem[];
  collapsed: boolean;
  onExpandSidebar: () => void;
}) {
  const activeNavPath = useActiveNavPath();
  const hasActiveItem = items.some((item) => item.to === activeNavPath);
  const [open, setOpen] = useState(hasActiveItem);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          onExpandSidebar();
        }}
        title={label}
        className="w-full flex items-center justify-center px-2 py-2 rounded-md"
        style={{ color: "var(--sidebar-ink-muted)" }}
      >
        <Icon />
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs uppercase tracking-wide"
        style={{ color: "var(--sidebar-ink-muted)" }}
      >
        <Icon />
        <span>{label}</span>
        <span className="ml-auto">
          <ChevronIcon open={open} />
        </span>
      </button>
      {open && (
        <div className="flex flex-col mt-1">
          {items.map((item) =>
            item.to ? (
              <Link
                key={item.label}
                to={item.to}
                className="rounded-md px-2 py-1 ml-4 text-sm"
                style={{
                  color: "var(--sidebar-ink)",
                  background: item.to === activeNavPath ? "var(--sidebar-active-bg)" : "transparent",
                }}
              >
                {item.label}
              </Link>
            ) : (
              <span
                key={item.label}
                className="rounded-md px-2 py-1 ml-4 text-sm cursor-not-allowed"
                style={{ color: "var(--sidebar-ink-muted)" }}
                title="Ships in a later sprint"
              >
                {item.label}
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
}

/** Same visual weight as a NavGroup header (uppercase, tracking-wide) but a
 * direct link with no children -- Dashboard reads as one of the list, not a
 * distinct admin action. */
function TopNavLink({
  to,
  label,
  icon: Icon,
  collapsed,
}: {
  to: string;
  label: string;
  icon: IconComponent;
  collapsed: boolean;
}) {
  const active = useActiveNavPath() === to;
  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-1.5"} px-2 py-1.5 rounded-md text-xs uppercase tracking-wide`}
      style={{
        color: active ? "var(--sidebar-ink)" : "var(--sidebar-ink-muted)",
        background: active ? "var(--sidebar-active-bg)" : "transparent",
      }}
    >
      <Icon />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { org } = useOrg();
  const terms = useTerminology();
  const navGroups = buildNavGroups(terms);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (!user) return false;
    return localStorage.getItem(`sidebar-collapsed:${user.id}`) === "true";
  });
  // The collapse toggle is desktop-only -- on a narrow viewport the mobile
  // drawer (translate-x based, always full width) is what's actually shown,
  // so the icon-only rendering below must never kick in there even if
  // `collapsed` is true from an earlier desktop session.
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia("(min-width: 768px)").matches);
  const location = useLocation();

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const effectiveCollapsed = collapsed && isDesktop;

  // Close the drawer on every navigation, not just a backdrop click --
  // otherwise picking a link leaves it open behind the new page.
  useEffect(() => setMobileNavOpen(false), [location.pathname]);

  function setCollapsedPersisted(next: boolean) {
    setCollapsed(next);
    if (user) localStorage.setItem(`sidebar-collapsed:${user.id}`, String(next));
  }
  function toggleCollapsed() {
    setCollapsedPersisted(!collapsed);
  }

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside
        className={`w-64 ${collapsed ? "md:w-16" : ""} shrink-0 p-4 flex flex-col gap-1 fixed md:relative inset-y-0 left-0 z-40 transform transition-all duration-200 ease-out md:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "var(--sidebar-bg)",
          // Darker toward the bottom regardless of theme -- a black
          // overlay rather than a fixed color, so it reads consistently
          // over whichever --sidebar-bg the active theme sets.
          backgroundImage: "linear-gradient(to bottom, rgba(0, 0, 0, 0.07) 15%, rgba(0,0,0,0.90) 100%)",
        }}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden md:flex items-center justify-center rounded-full"
          style={{
            position: "absolute",
            top: "50%",
            right: -11,
            transform: "translateY(-50%)",
            width: 22,
            height: 22,
            background: "var(--sidebar-bg)",
            border: "1px solid var(--sidebar-ink-muted)",
            color: "var(--sidebar-ink-muted)",
            zIndex: 50,
          }}
        >
          <CollapseToggleIcon collapsed={collapsed} />
        </button>

        <div className={`mb-4 flex items-center gap-2 ${collapsed ? "md:justify-center" : ""}`}>
          {org?.logoUrl ? (
            <img src={org.logoUrl} alt={org.displayName} className="h-8 w-8 rounded object-contain shrink-0" />
          ) : (
            <Logo className="h-8 w-auto shrink-0" surface="sidebar" />
          )}
          <div className={collapsed ? "md:hidden" : ""}>
            <div className="font-semibold leading-tight" style={{ color: "var(--sidebar-ink)" }}>
              {org?.displayName ?? "Synaxis MMP"}
            </div>
            <div className="text-xs leading-tight" style={{ color: "var(--sidebar-ink-muted)" }}>
              {org ? "Synaxis MMP" : "A Ministry Management Platform"}
            </div>
          </div>
        </div>

        {user?.role === Role.PLATFORM_ADMIN && (
          <Link
            to="/platform"
            title={effectiveCollapsed ? "Platform Admin" : undefined}
            className={`rounded-md px-2 py-1.5 text-sm font-medium mb-2 ${collapsed ? "md:text-center" : ""}`}
            style={{ background: "var(--sidebar-active-bg)", color: "var(--sidebar-ink)" }}
          >
            {effectiveCollapsed ? "PA" : "Platform Admin"}
          </Link>
        )}

        {/* A Platform Administrator isn't a member of any church, so none of
            this tenant nav applies to them -- the Platform Admin link above
            is their only destination here. */}
        {user?.role !== Role.PLATFORM_ADMIN && (
          <nav className="mt-1 flex flex-col gap-1 overflow-y-auto flex-1 sidebar-nav">
            <TopNavLink to="/" label="Dashboard" icon={HomeIcon} collapsed={effectiveCollapsed} />
            {navGroups.map((group) => (
              <NavGroup
                key={group.label}
                label={group.label}
                icon={group.icon}
                items={group.items}
                collapsed={effectiveCollapsed}
                onExpandSidebar={() => setCollapsedPersisted(false)}
              />
            ))}
            {user?.role === Role.ORG_ADMIN && (
              <NavGroup
                label={SETUP_GROUP.label}
                icon={SETUP_GROUP.icon}
                items={SETUP_GROUP.items}
                collapsed={effectiveCollapsed}
                onExpandSidebar={() => setCollapsedPersisted(false)}
              />
            )}
          </nav>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--line)" }}
        >
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden rounded-md p-1.5 -ml-1.5"
              style={{ color: "var(--ink-muted)" }}
              title="Menu"
            >
              <HamburgerIcon />
            </button>
            {user && (
              <span>
                <span className="font-medium">{user.fullName}</span>{" "}
                <span style={{ color: "var(--ink-muted)" }}>· {user.role.replace(/_/g, " ").toLowerCase()}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <SyncStatus />
            <NotificationBell />
            <Logo className="h-6 w-auto" />
            <ModeToggle />
            {user?.role !== Role.PLATFORM_ADMIN && <Avatar />}
            <button
              type="button"
              onClick={() => logout()}
              className="text-sm underline"
              style={{ color: "var(--ink-muted)" }}
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
