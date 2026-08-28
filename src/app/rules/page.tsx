import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Rules of Engagement",
  description:
    "How students and alumni are expected to behave in the TELPSAM mentorship portal.",
};

const sections = [
  {
    heading: "1. Why these rules exist",
    body: [
      "The TELPSAM portal exists to help students grow through the guidance of alumni who have walked ahead of them. It is a ministry of care, not a networking free-for-all. These rules protect both students and alumni and keep every relationship healthy, accountable, and God-honouring.",
      "By taking part, as a student or an alumnus, you agree to everything below. The TELPSAM Program Coordinators may pause or remove anyone who breaks these rules.",
    ],
  },
  {
    heading: "2. All interaction stays in the portal",
    body: [
      "Every conversation between a mentor and mentee happens inside this portal, where the Program Coordinators can support and safeguard it.",
      "Do not share or ask for phone numbers, personal email addresses, social media handles, or any other private contact.",
      "Do not move the conversation to WhatsApp, calls, or any outside channel.",
      "If a phone call would genuinely help, either of you can request one using Request a phone call in the conversation. The request is private, the other person is not told, and a Program Coordinator will review it and arrange the call safely. Never share or ask for a number directly.",
    ],
  },
  {
    heading: "3. Pairings are assigned by the Program Coordinators",
    body: [
      "Students do not contact alumni directly. The TELPSAM Program Coordinators review requests and assign each mentee to a mentor.",
      "This protects everyone from unwanted or unsafe contact and makes sure mentorship is intentional and matched well.",
    ],
  },
  {
    heading: "4. No money, no favours, no meet-ups",
    body: [
      "No one may ask a mentor or mentee for money, gifts, loans, jobs in exchange for favours, or any material benefit.",
      "Do not arrange private, in-person meet-ups through the portal. Any legitimate event will be organised and communicated by the TELPSAM Program Coordinators.",
    ],
  },
  {
    heading: "5. How to treat one another",
    body: [
      "Be respectful, honest, and encouraging. Keep conversations focused on guidance, growth, studies, career, character, and faith.",
      "No harassment, romantic or sexual advances, discrimination, or pressure of any kind.",
      "Alumni: you are a role model. Point students to wisdom, not to yourself. Encourage them toward God, family, and community, never toward dependence on you.",
      "Students: come with genuine questions and a teachable heart. Value your mentor's time.",
    ],
  },
  {
    heading: "6. Privacy",
    body: [
      "Alumni personal contact details are never shown to students. Only the information an alumnus chooses to share on their profile is visible.",
      "Do not screenshot, share, or repost another person's information outside the portal.",
    ],
  },
  {
    heading: "7. Mentorships are time-bound (3 months)",
    body: [
      "Each mentorship runs for 3 months and then ends automatically. This is deliberate, not a limitation.",
      "This portal exists to expose students to alumni they would not usually have access to. It is not meant to replace the ongoing, informal mentorship that should keep happening in your branch and chapter, which we want to encourage, not compete with. Keeping each pairing time-bound keeps it focused and intentional.",
      "If continuing would genuinely help, either of you can request a one-time 2-week extension. A coordinator reviews and decides. After that, encourage the relationship to continue through your branch or chapter.",
    ],
  },
  {
    heading: "8. Reaching the coordinators",
    body: [
      "You can message the Program Coordinators at any time using Contact Coordinators in the menu, for a question, a concern, or help with your account. Any coordinator may reply, and you will not be told which one.",
    ],
  },
  {
    heading: "9. Privacy, flagging, and oversight",
    body: [
      "Your conversations are private. The Program Coordinators do not read mentorship chats.",
      "To keep everyone safe, the portal automatically flags messages that break these rules, such as sharing a phone number, asking for money, or trying to meet or move the conversation off-platform. When something is flagged, or when someone files a report, coordinators can then review that conversation.",
      "If anything makes you uncomfortable, report it in the portal immediately using Report a concern. You will never be in trouble for reporting a genuine concern.",
      "Breaking these rules may lead to a warning, suspension, or removal, at the discretion of the Program Coordinators.",
    ],
  },
];

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/telpsam-logo.png"
              alt="TELPSAM"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
            <span className="font-serif font-bold text-ink">TELPSAM Portal</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-navy"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-14">
        <p className="eyebrow">The agreement</p>
        <h1 className="mt-3 font-serif text-4xl font-bold text-ink">
          Rules of Engagement
        </h1>
        <p className="mt-4 leading-relaxed text-body">
          Please read these carefully. Everyone who joins the TELPSAM portal
          agrees to them. They are what keep this a safe place to give and
          receive mentorship.
        </p>

        <div className="card mt-8 flex items-start gap-3 border-gold/40 bg-gold-soft/40 p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
          <p className="text-sm text-ink">
            In short: keep every conversation in the portal, let the Program
            Coordinators do the matching, and never ask for money, contacts, or
            private meet-ups.
          </p>
        </div>

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
          <Link href="/join" className="btn btn-primary">
I agree, join the portal
          </Link>
          <Link href="/" className="btn btn-outline">
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
