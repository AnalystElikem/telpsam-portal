import { Compass } from "lucide-react";

// Lightweight structure for a mentorship: a suggested rhythm, conversation
// starters, and goal-setting prompts. Static guidance — no data stored.
const STARTERS = [
  "Introduce yourselves: where you're from, your school or work, and your walk with God.",
  "Mentee: share one thing you're hoping to grow in this term (studies, character, faith, career).",
  "Mentor: share a challenge you faced at their stage and what helped you through it.",
  "Talk about a Scripture or principle that has shaped how you make decisions.",
];

const GOALS = [
  "What does the mentee want to be true in 3 months' time?",
  "One habit or discipline to build together.",
  "One area of study, career, or character to focus on.",
];

export default function MentorshipGuide({ open = false }: { open?: boolean }) {
  return (
    <details open={open} className="mt-3 rounded-lg border border-line bg-white p-4">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
        <Compass className="h-4 w-4 text-teal" /> Getting started &amp; conversation ideas
      </summary>

      <div className="mt-3 space-y-4 text-sm text-body">
        <p>
          <span className="font-semibold text-ink">A good rhythm:</span> aim for a
          message or two each week, and reply within a few days. Consistency matters
          more than long messages.
        </p>

        <div>
          <p className="font-semibold text-ink">Conversation starters</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {STARTERS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-semibold text-ink">Set a few goals together</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {GOALS.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
