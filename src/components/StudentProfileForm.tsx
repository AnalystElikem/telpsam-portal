"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { saveStudentProfile } from "@/app/actions/student";
import BranchSelect from "@/components/BranchSelect";
import PhoneInput from "@/components/PhoneInput";

export type StudentInitial = {
  full_name: string;
  gender: string;
  phone: string;
  school: string;
  education_level: string;
  class_level: string;
  church_branch: string;
  parent_name: string;
  parent_contact: string;
};

const LEVELS = ["SHS 3", "Completed SHS", "Tertiary"];

// Class/level options depend on the level chosen, so the two always agree.
const SHS_CLASSES = [
  "General Science",
  "General Arts",
  "Business",
  "Visual Arts",
  "Home Economics",
  "Agricultural Science",
  "Technical",
  "Other",
];
const TERTIARY_CLASSES = ["Level 100", "Level 200", "Level 300", "Level 400", "Level 500", "Level 600"];

function classOptions(level: string): string[] {
  if (level === "Tertiary") return TERTIARY_CLASSES;
  if (level === "SHS 3" || level === "Completed SHS") return SHS_CLASSES;
  return [];
}

export default function StudentProfileForm({
  initial,
  returnTo = "/welcome",
  submitLabel = "Save and submit for approval",
}: {
  initial: StudentInitial;
  returnTo?: string;
  submitLabel?: string;
}) {
  const [level, setLevel] = useState(initial.education_level);
  const [klass, setKlass] = useState(initial.class_level);
  const options = classOptions(level);

  function onLevelChange(next: string) {
    setLevel(next);
    // Reset the class if it no longer fits the new level.
    if (!classOptions(next).includes(klass)) setKlass("");
  }

  return (
    <form action={saveStudentProfile} className="space-y-6">
      <input type="hidden" name="return_to" value={returnTo} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Full name</label>
          <input name="full_name" required defaultValue={initial.full_name} className="field" placeholder="Your full name" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Gender</label>
          <select name="gender" required defaultValue={initial.gender} className="field">
            <option value="" disabled>Select…</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">School / institution</label>
        <input name="school" required defaultValue={initial.school} className="field" placeholder="e.g. Achimota School, University of Ghana" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Level of education</label>
          <select
            name="education_level"
            required
            value={level}
            onChange={(e) => onLevelChange(e.target.value)}
            className="field"
          >
            <option value="" disabled>Select your level…</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">This programme is open to SHS 3 and above.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">
            {level === "Tertiary" ? "Level / year" : "Programme"}
          </label>
          <select
            name="class_level"
            required
            value={klass}
            onChange={(e) => setKlass(e.target.value)}
            disabled={options.length === 0}
            className="field"
          >
            <option value="" disabled>
              {options.length === 0 ? "Choose your level first" : "Select…"}
            </option>
            {options.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Church branch</label>
        <BranchSelect defaultValue={initial.church_branch} required />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Your phone number</label>
        <PhoneInput name="phone" defaultValue={initial.phone} required />
      </div>

      <div className="rounded-xl border border-line bg-canvas p-4">
        <p className="text-sm font-semibold text-ink">Parent or guardian</p>
        <p className="mt-1 text-xs text-muted">Required so a trusted adult can be reached if ever needed.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Parent / guardian name</label>
            <input name="parent_name" required defaultValue={initial.parent_name} className="field" placeholder="Full name" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Parent / guardian phone</label>
            <PhoneInput name="parent_contact" defaultValue={initial.parent_contact} required />
          </div>
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-lg bg-gold-soft/50 p-3 text-xs text-ink">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
        Your phone number and your parent or guardian&apos;s details are private.
        They are used only by the Program Coordinators and are never shown to
        mentors or other members.
      </p>

      <button type="submit" className="btn btn-primary w-full sm:w-auto">
        {submitLabel}
      </button>
    </form>
  );
}
