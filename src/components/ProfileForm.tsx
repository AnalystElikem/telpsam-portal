"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { UserRound, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveAlumniProfile } from "@/app/actions/alumni";
import BranchSelect from "@/components/BranchSelect";
import PhoneInput from "@/components/PhoneInput";

export type ProfileInitial = {
  userId: string;
  title: string;
  gender: string;
  full_name: string;
  campus: string;
  avatar_url: string;
  grad_year: string;
  qualifications: string;
  job_title: string;
  organization: string;
  industry: string;
  interests: string;
  bio: string;
  phone: string;
  church_branch: string;
  is_published: boolean;
};

const BIO_MIN_WORDS = 30;
const BIO_MAX_WORDS = 150;
const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export default function ProfileForm({ initial }: { initial: ProfileInitial }) {
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [bio, setBio] = useState(initial.bio);
  const bioWords = countWords(bio);
  const bioOk = bioWords >= BIO_MIN_WORDS && bioWords <= BIO_MAX_WORDS;
  const bioRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = bioRef.current;
    if (!el) return;
    el.setCustomValidity(
      bioOk
        ? ""
        : bioWords < BIO_MIN_WORDS
          ? `Please write at least ${BIO_MIN_WORDS} words (you have ${bioWords}).`
          : `Please keep it under ${BIO_MAX_WORDS} words (you have ${bioWords}).`
    );
  }, [bioOk, bioWords]);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const supabase = createClient();
      // Shrink big phone photos in the browser so uploads are small and fast.
      let blob: Blob = file;
      let ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      try {
        blob = await downscaleImage(file, 800, 0.85);
        ext = "jpg";
      } catch {
        // Unusual format we can't process — fall back to the original file.
      }
      const path = `${initial.userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: blob.type || "image/jpeg" });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch (err) {
      const msg = (err as { message?: string })?.message || "";
      console.error("Avatar upload failed:", err);
      setUploadError(
        /bucket/i.test(msg)
          ? "Photo storage isn't set up yet — please let the coordinators know."
          : /row-level|policy|unauthor/i.test(msg)
            ? "You need to be signed in to upload a photo. Try signing in again."
            : "Couldn't upload that image. Please try a JPG or PNG."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={saveAlumniProfile} className="space-y-6">
      <input type="hidden" name="avatar_url" value={avatarUrl} />
      <input type="hidden" name="return_to" value="/profile" />

      {/* Photo */}
      <div className="flex items-center gap-5">
        <div className="relative h-24 w-24 overflow-hidden rounded-full border border-line bg-canvas">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" fill className="object-cover" sizes="96px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted">
              <UserRound className="h-10 w-10" />
            </div>
          )}
        </div>
        <div>
          <label className="btn btn-outline cursor-pointer">
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading…" : "Upload photo"}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} disabled={uploading} />
          </label>
          {uploadError && <p className="mt-1 text-xs text-danger">{uploadError}</p>}
          <p className="mt-1 text-xs text-muted">A clear headshot works best.</p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-[130px_1fr]">
        <Field label="Title" name="title" required defaultValue={initial.title} placeholder="Dr., Rev., Mr., Mrs." />
        <Field label="Full name" name="full_name" defaultValue={initial.full_name} required />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Gender</label>
          <select name="gender" required defaultValue={initial.gender} className="field">
            <option value="" disabled>Select…</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <Field label="Campus / Fellowship" name="campus" required defaultValue={initial.campus} placeholder="e.g. KNUST, TELPSAM Kumasi" />
        <Field label="Graduation year" name="grad_year" required defaultValue={initial.grad_year} placeholder="e.g. 2015" inputMode="numeric" pattern="(19|20)\d{2}" title="A 4-digit year, e.g. 2015" />
        <Field label="Current role / title" name="job_title" required defaultValue={initial.job_title} placeholder="e.g. Software Engineer" />
        <Field label="Organization" name="organization" required defaultValue={initial.organization} placeholder="Where you work" />
        <Field label="Industry / field" name="industry" required defaultValue={initial.industry} placeholder="e.g. Healthcare, Tech, Education" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Qualifications</label>
        <input name="qualifications" required defaultValue={initial.qualifications} className="field" placeholder="e.g. BSc Computer Science; MBA" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Phone number</label>
          <PhoneInput name="phone" defaultValue={initial.phone} required />
          <p className="mt-1 text-xs text-muted">
            For official use by the Program Coordinators only. It is never shown to students or published.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Church branch</label>
          <BranchSelect defaultValue={initial.church_branch} required />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">
          Interests <span className="font-normal text-muted">(optional)</span>
        </label>
        <input name="interests" defaultValue={initial.interests} className="field" placeholder="Comma-separated, e.g. Missions, Entrepreneurship, Mentoring" />
        <p className="mt-1 text-xs text-muted">Separate with commas.</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Short bio</label>
        <textarea
          ref={bioRef}
          name="bio"
          required
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={5}
          className="field"
          placeholder="A few sentences about your journey and what you can share with students."
        />
        <p className={`mt-1 text-xs ${bio.length > 0 && !bioOk ? "text-danger" : "text-muted"}`}>
          {bioWords} {bioWords === 1 ? "word" : "words"} · aim for {BIO_MIN_WORDS}–{BIO_MAX_WORDS} words.
        </p>
      </div>

      <label className="flex items-start gap-2 rounded-lg border border-line bg-white p-4 text-sm text-ink">
        <input type="checkbox" name="is_published" defaultChecked={initial.is_published} className="mt-0.5" />
        <span>
          Make my profile visible in the student directory.{" "}
          <span className="text-muted">
            (It appears only after the TELPSAM Program Coordinators approve it.)
          </span>
        </span>
      </label>

      <button type="submit" className="btn btn-primary">Save profile</button>
    </form>
  );
}

// Downscale an image file to a max dimension and return a JPEG blob.
function downscaleImage(file: File, maxDim: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas context"));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("could not load image"));
    };
    img.src = url;
  });
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">{label}</label>
      <input className="field" {...props} />
    </div>
  );
}
