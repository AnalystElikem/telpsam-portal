import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Lets a signed-in member download their own data (right of access). RLS makes
// sure each query only ever returns the caller's own rows.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const uid = user.id;
  const [profile, alumni, alumniContact, student, requests, mentorships, messages, reports] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("alumni_profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("alumni_contact").select("*").eq("id", uid).maybeSingle(),
      supabase.from("student_profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("mentorship_requests").select("*").eq("student_id", uid),
      supabase.from("mentorships").select("*").or(`mentor_id.eq.${uid},mentee_id.eq.${uid}`),
      supabase.from("messages").select("*").eq("sender_id", uid),
      supabase.from("reports").select("*").eq("reporter_id", uid),
    ]);

  const payload = {
    exported_at: new Date().toISOString(),
    account: { id: uid, email: user.email },
    profile: profile.data,
    alumni_profile: alumni.data,
    alumni_contact: alumniContact.data,
    student_profile: student.data,
    mentorship_requests: requests.data ?? [],
    mentorships: mentorships.data ?? [],
    messages_you_sent: messages.data ?? [],
    reports_you_filed: reports.data ?? [],
  };

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="telpsam-data-${date}.json"`,
    },
  });
}
