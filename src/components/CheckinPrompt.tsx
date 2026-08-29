"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitCheckin } from "@/app/actions/messages";

const OPTIONS = [
  { rating: "good", label: "Going well" },
  { rating: "okay", label: "It's okay" },
  { rating: "concern", label: "I have a concern" },
];

export default function CheckinPrompt({ mentorshipId }: { mentorshipId: string }) {
  const [submitted, setSubmitted] = useState(false);

  async function act(formData: FormData) {
    setSubmitted(true); // instant feedback; the server action then records it
    await submitCheckin(formData);
  }

  if (submitted) {
    return (
      <p className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-success">
        <CheckCircle2 className="h-4 w-4" /> Thanks for the check-in.
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-teal/30 bg-teal-soft/40 p-3">
      <p className="text-sm font-semibold text-ink">Quick check-in: how is this mentorship going?</p>
      <p className="mt-0.5 text-xs text-body">Your answer is private. Choose “I have a concern” if anything feels off.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <form key={o.rating} action={act}>
            <input type="hidden" name="mentorship_id" value={mentorshipId} />
            <input type="hidden" name="rating" value={o.rating} />
            <button
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                o.rating === "concern"
                  ? "border-danger/40 text-danger hover:bg-red-50"
                  : "border-line text-body hover:bg-white"
              }`}
            >
              {o.label}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
