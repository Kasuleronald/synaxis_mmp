import { useOrg } from "../context/OrgContext";

/** Different churches call the same concept different things -- "Cell
 * Group" vs "Fellowship", "Family Unit" vs "Household". Scoped to just the
 * core entity nouns (nav labels + page titles), not every string in the
 * app, per explicit direction. Falls back to the built-in English default
 * whenever an org hasn't set a custom term. */
export function useTerminology() {
  const { org } = useOrg();
  return {
    member: org?.memberTerm || "Members",
    household: org?.householdTerm || "Households",
    fellowship: org?.fellowshipTerm || "Fellowships",
    department: org?.departmentTerm || "Departments",
    devotional: org?.devotionalTerm || "Daily Devotional",
  };
}
