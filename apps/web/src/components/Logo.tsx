import logoLight from "../assets/logo-light.png";
import logoDark from "../assets/logo-dark.png";
import { useTheme } from "../context/ThemeContext";

export function Logo({ className, surface = "page" }: { className?: string; surface?: "page" | "sidebar" }) {
  const { mode } = useTheme();
  // Purple/magenta mark reads on a light surface; green/gold reads on dark.
  // The sidebar is always a dark, theme-colored fill now (independent of
  // light/dark mode), so it always gets the dark-surface mark; everywhere
  // else still swaps with the page's own mode.
  const onDarkSurface = surface === "sidebar" || mode === "dark";
  return <img src={onDarkSurface ? logoDark : logoLight} alt="Synaxis MMP" className={className} />;
}
