import { notFound } from "next/navigation";

// Retired: coordinators are now appointed by the super admin from
// Admin → Coordinators, so the public code-based self-signup no longer exists.
export default function OfficePage() {
  notFound();
}
