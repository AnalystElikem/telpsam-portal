"use server";

import { createClient } from "@/lib/supabase/server";

// Uploads a profile photo on the server, using the signed-in user's session.
// The browser sends an already-shrunk image; this avoids any browser-side
// storage/auth/CSP quirks.
export async function uploadAvatar(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No image received." };

  const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg").replace("+xml", "");
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (error) return { error: error.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { url: data.publicUrl };
}
