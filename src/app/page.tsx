import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Users,
  MessagesSquare,
  GraduationCap,
  UserCheck,
  Lock,
} from "lucide-react";
import { getProfile } from "@/lib/auth";

const HERO_IMG = "/images/telpsam-4.jpg";
const BAND_IMG = "/images/telpsam-3.jpg";
const COMMUNITY_IMG = "/images/telpsam-1.jpg";

const steps = [
  {
    icon: UserCheck,
    title: "Alumni Enlist",
    text: "Graduates create a profile with their journey, qualifications, work, and interests, reviewed and approved by the TELPSAM Program Coordinators.",
    bg: "bg-navy",
  },
  {
    icon: Users,
    title: "Students Explore",
    text: "Current students browse the alumni network for inspiration and see how those ahead of them have walked their paths.",
    bg: "bg-teal",
  },
  {
    icon: ShieldCheck,
    title: "The Coordinators Match",
    text: "Mentorship pairings are assigned and overseen by the TELPSAM Program Coordinators, never arranged privately, to keep everyone safe.",
    bg: "bg-gold",
  },
  {
    icon: MessagesSquare,
    title: "Guided Conversations",
    text: "Mentor and mentee talk inside the portal, where the Coordinators can support and safeguard every interaction.",
    bg: "bg-coral",
  },
];

const safeguards = [
  "All conversations happen inside the portal. No phone numbers or personal contacts are exchanged.",
  "No requests for money, gifts, or favours. Ever.",
  "No private meet-ups arranged through the platform.",
  "Pairings are assigned by the TELPSAM Program Coordinators, never arranged privately.",
  "Conversations are private, but anything that breaks the rules is flagged automatically, and anyone can report a concern.",
];

export default async function Home() {
  const profile = await getProfile();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/telpsam-logo.png" alt="TELPSAM" width={40} height={40} className="h-10 w-10 object-contain" />
            <span className="font-serif text-lg font-bold text-ink">
              TELPSAM <span className="text-gold-600">Portal</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/rules" className="hidden text-sm font-medium text-body hover:text-navy sm:block">
              Rules of Engagement
            </Link>
            {profile ? (
              <Link href="/dashboard" className="btn btn-primary">Go to my portal</Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-outline">Sign in</Link>
                <Link href="/join" className="btn btn-primary">Join</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0" aria-hidden>
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-teal/30 blur-3xl" />
          <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-gold/25 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-coral/20 blur-3xl" />
        </div>
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="eyebrow text-gold">The TELPSAM Alumni Network</p>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-tight text-white md:text-5xl">
              Learn from those who have{" "}
              <span className="text-gold">gone ahead</span> of you.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/85">
              A guided mentorship space connecting TELPSAM students with alumni.
              It is centrally coordinated, protected, and overseen by the TELPSAM
              Program Coordinators, so wisdom is shared safely and interactions
              stay accountable.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/join?role=student" className="btn btn-gold">
                <GraduationCap className="h-4 w-4" /> I&apos;m a student
              </Link>
              <Link href="/join?role=alumnus" className="btn bg-white text-navy hover:bg-white/90">
                <UserCheck className="h-4 w-4" /> I&apos;m an alumnus
              </Link>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-white/70">
              <Lock className="h-4 w-4" /> Every connection is coordinated and
              safeguarded by the Program Coordinators.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -right-4 -top-4 h-full w-full rounded-3xl bg-gold/30" aria-hidden />
            <div className="absolute -bottom-4 -left-4 h-full w-full rounded-3xl bg-teal/30" aria-hidden />
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border-4 border-white/10 shadow-2xl">
              <Image src={HERO_IMG} alt="A TELPSAM speaker sharing with students" fill className="object-cover" sizes="(max-width: 1024px) 90vw, 420px" priority />
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-5 py-6 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, label: "Centrally Coordinated", color: "text-teal" },
            { icon: Lock, label: "Private & In-Portal", color: "text-gold-600" },
            { icon: Users, label: "A Network Designed for Impact", color: "text-coral" },
          ].map((t) => (
            <div key={t.label} className="flex items-center justify-center gap-2 text-center text-sm font-semibold text-ink">
              <t.icon className={`h-5 w-5 shrink-0 ${t.color}`} /> {t.label}
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="max-w-2xl">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-h2">Mentorship Done Responsibly</h2>
          <p className="mt-3 leading-relaxed text-body">
            Students do not cold-contact alumni. Every mentorship is arranged and
            watched over by the TELPSAM Program Coordinators, so the relationship
            is safe for both sides. Each pairing runs for 3 months, enough to open a
            door to an alumnus you would not usually reach, without replacing the
            mentorship that continues in your branch and chapter.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="card p-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${s.bg}`}>
                <s.icon className="h-6 w-6" />
              </div>
              <p className="mt-4 text-xs font-bold text-gold-600">STEP {i + 1}</p>
              <h3 className="mt-1 text-lg font-bold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Image band */}
      <section className="relative overflow-hidden">
        <div className="relative min-h-[360px]">
          <Image src={BAND_IMG} alt="TELPSAM Program Coordinators at a conference" fill className="object-cover object-[center_28%]" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/40" />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-6xl px-5">
              <blockquote className="max-w-xl">
                <p className="font-serif text-2xl font-bold leading-snug text-white md:text-3xl">
                  &ldquo;A generation blessed by the one before it. This is how we
                  raise leaders.&rdquo;
                </p>
                <p className="mt-4 text-white/75">
                  Mentorship at TELPSAM is intentional, protected, and rooted in care.
                </p>
                <Link href="/rules" className="btn btn-gold mt-6">
                  See the Rules of Engagement
                </Link>
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* Safeguards */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="eyebrow">Built on trust</p>
            <h2 className="mt-3 text-h2">The rules that keep this safe</h2>
            <p className="mt-4 leading-relaxed text-body">
              This portal exists to help, not to expose. Both students and alumni
              agree to clear rules of engagement before taking part, and the
              Program Coordinators hold everyone to them.
            </p>
            <ul className="mt-6 space-y-3">
              {safeguards.map((s) => (
                <li key={s} className="flex gap-3 rounded-xl bg-canvas p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
                  <span className="text-body">{s}</span>
                </li>
              ))}
            </ul>
            <Link href="/rules" className="btn btn-outline mt-6">
              Read the full Rules of Engagement
            </Link>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-xl lg:aspect-auto lg:h-[560px]">
            <Image src={COMMUNITY_IMG} alt="The TELPSAM community" fill className="object-cover" sizes="(max-width: 1024px) 90vw, 520px" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white/70">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 py-10 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Image src="/telpsam-logo.png" alt="TELPSAM" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="text-sm">TELPSAM Alumni &amp; Mentorship Portal</span>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-sm">
            <Link href="/rules" className="hover:text-white">Rules of Engagement</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/login" className="hover:text-white">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
