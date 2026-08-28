import { GraduationCap } from "lucide-react";
import { transitionToAlumnus, snoozeTransition } from "@/app/actions/student";

// Shown to tertiary students about a year after they registered: a gentle nudge
// to move over to the alumni network once they've completed. Dismissable.
export default function TransitionPrompt({ classLevel }: { classLevel: string | null }) {
  return (
    <div className="mb-6 rounded-xl border border-teal/40 bg-teal-soft/40 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal text-white">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-ink">Have you completed your studies?</p>
          <p className="mt-1 text-sm text-body">
            You registered {classLevel ? `as ${classLevel}` : "as a tertiary student"} a
            while ago, so we expect you may have completed by now. If you have,
            transition to the alumni network so you can mentor the next generation.
            If not, just dismiss this and we&apos;ll check in again later.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <form action={transitionToAlumnus}>
              <button className="btn btn-primary !py-1.5 !text-sm">
                I&apos;ve completed — become an alumnus
              </button>
            </form>
            <form action={snoozeTransition}>
              <button className="btn btn-outline !py-1.5 !text-sm">Not yet, remind me later</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
