import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";

// Sends each role to its home screen.
export default async function Dashboard() {
  const profile = await requireProfile();
  if (profile.role === "admin") redirect("/admin");
  if (profile.role === "alumnus") redirect("/profile");
  redirect("/directory");
}
