import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms for using the TELPSAM Alumni & Mentorship Portal.",
};

const sections = [
  {
    heading: "1. About the portal",
    body: [
      "The TELPSAM Alumni & Mentorship Portal is a safeguarded space that connects TELPSAM students with alumni for mentorship. It is run by the TELPSAM Program Coordinators.",
    ],
  },
  {
    heading: "2. Who can join",
    body: [
      "Students must be in SHS 3 or above. Alumni are past TELPSAM members willing to mentor. Every account is reviewed and approved by a Program Coordinator before it becomes active.",
    ],
  },
  {
    heading: "3. Your account",
    body: [
      "Give accurate information and keep it up to date. Keep your password secure and do not share your account. Coordinator (admin) accounts are created only with an access code.",
    ],
  },
  {
    heading: "4. How you must behave",
    body: [
      "You agree to the Rules of Engagement. In short: keep every conversation inside the portal; never share or ask for phone numbers, money, gifts, or favours; never arrange private meet-ups; and treat one another with respect.",
      "Mentorship pairings are assigned by the Program Coordinators. Students do not contact alumni directly.",
    ],
  },
  {
    heading: "5. Safeguarding and monitoring",
    body: [
      "Conversations are private, but the portal automatically flags messages that breach the rules, and anyone can report a concern. Coordinators may then review that conversation.",
      "You can request a phone call through the portal; a coordinator reviews and arranges it. Numbers are never shared directly between members.",
    ],
  },
  {
    heading: "6. Mentorships are time-bound",
    body: [
      "Each mentorship runs for 3 months and then ends automatically. The purpose is to expose students to alumni they would not usually reach, not to replace the informal mentorship that continues in branches and chapters.",
      "Either participant may request a one-time 2-week extension, which a coordinator reviews and approves or declines.",
      "You can also message the coordinators at any time through the portal; any coordinator may respond.",
    ],
  },
  {
    heading: "7. Suspension and removal",
    body: [
      "Breaking these terms or the Rules of Engagement may lead to a warning, suspension, or removal, at the discretion of the Program Coordinators.",
    ],
  },
  {
    heading: "8. No warranty; limitation",
    body: [
      "The portal is provided as a ministry service, as is, without warranties. To the extent permitted by law, TELPSAM is not liable for indirect or consequential loss arising from use of the portal.",
    ],
  },
  {
    heading: "9. Changes",
    body: [
      "We may update these terms from time to time. Continued use of the portal means you accept the current terms.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/telpsam-logo.png" alt="TELPSAM" width={36} height={36} className="h-9 w-9 object-contain" />
            <span className="font-serif font-bold text-ink">TELPSAM Portal</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-navy">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-14">
        <p className="eyebrow">The fine print</p>
        <h1 className="mt-3 font-serif text-4xl font-bold text-ink">Terms of Use</h1>
        <p className="mt-4 leading-relaxed text-body">
          Please read these terms. Using the TELPSAM portal means you agree to them.
        </p>

        <div className="mt-10 space-y-10">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-bold text-ink">{s.heading}</h2>
              <div className="mt-3 space-y-3 leading-relaxed text-body">
                {s.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-3 border-t border-line pt-8">
          <Link href="/rules" className="btn btn-outline">Rules of Engagement</Link>
          <Link href="/privacy" className="btn btn-outline">Privacy Policy</Link>
        </div>
      </main>
    </div>
  );
}
