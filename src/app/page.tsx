import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Users,
  MessagesSquare,
  GraduationCap,
  UserCheck,
  Lock,
  Globe,
  HeartHandshake,
  MapPin,
  ArrowRight,
  Quote,
  Sprout,
} from "lucide-react";
import { getProfile } from "@/lib/auth";

const HERO_IMG = "/images/telpsam-event-3.jpg";
const TESTIMONIAL_IMG = "/images/telpsam-event-1.jpg";
const SAFE_IMG = "/images/telpsam-event-2.jpg";

const ribbon = [
  { src: "/images/telpsam-event-2.jpg", alt: "TELPSAM members in conversation" },
  { src: "/images/telpsam-event-1.jpg", alt: "A speaker at the TELPSAM conference" },
  { src: "/images/telpsam-community.png", alt: "The TELPSAM community" },
  { src: "/images/telpsam-event-3.jpg", alt: "An evening gathering under the lights" },
  { src: "/images/telpsam-1.jpg", alt: "TELPSAM community" },
  { src: "/images/telpsam-4.jpg", alt: "A mentor sharing with students" },
];

const heroPills = [
  { icon: HeartHandshake, label: "Personally introduced" },
  { icon: Lock, label: "Private & in-portal" },
  { icon: Sprout, label: "Built for growth" },
];

const steps = [
  {
    icon: UserCheck,
    title: "Alumni step forward",
    text: "Graduates share their story, work, and what they can help with. Every profile is reviewed and welcomed in by the Program Coordinators.",
    tint: "bg-forest-soft text-forest",
  },
  {
    icon: Users,
    title: "You find your people",
    text: "Browse alumni who have walked the path ahead of you — across cities, industries, and generations — and see who you'd love to learn from.",
    tint: "bg-clay-soft text-clay-600",
  },
  {
    icon: HeartHandshake,
    title: "We introduce you",
    text: "Pairings are made and cared for by the Program Coordinators, never arranged privately — so both sides feel safe from the very first hello.",
    tint: "bg-honey-soft text-honey-700",
  },
  {
    icon: MessagesSquare,
    title: "You talk, gently guided",
    text: "Mentor and mentee talk inside the portal, at a natural pace, with the Coordinators quietly looking out for everyone.",
    tint: "bg-forest-soft text-forest",
  },
];

const safeguards = [
  "Every conversation stays inside the portal. No phone numbers or private contacts change hands.",
  "No requests for money, gifts, or favours. Ever.",
  "No private meet-ups arranged through the platform.",
  "Pairings are made by the Program Coordinators, never arranged privately.",
  "Chats are private — but anything that breaks the rules is flagged, and anyone can raise a concern.",
];

export default async function Home() {
  const profile = await getProfile();

  return (
    <div className="min-h-screen bg-cream text-body">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-line bg-cream/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/telpsam-logo.png" alt="TELPSAM" width={38} height={38} className="h-9 w-9 object-contain" />
            <span className="font-serif text-lg font-bold text-forest">TELPSAM</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/rules" className="hidden text-sm font-medium text-body hover:text-forest sm:block">
              Rules of Engagement
            </Link>
            {profile ? (
              <Link href="/dashboard" className="btn btn-forest">Go to my portal</Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-forest-outline">Sign in</Link>
                <Link href="/join" className="btn btn-forest">Join</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero — full-bleed, atmospheric */}
      <section className="relative isolate flex min-h-[88vh] items-center overflow-hidden">
        <Image src={HERO_IMG} alt="A TELPSAM evening gathering under the lights" fill priority className="-z-10 object-cover object-center" sizes="100vw" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0d1526]/94 via-[#0d1526]/72 to-[#0d1526]/25" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0d1526]/85 via-transparent to-transparent" />

        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <div className="max-w-4xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-honey backdrop-blur">
              <Sprout className="h-3.5 w-3.5" /> The TELPSAM Alumni Mentorship Network
            </p>
            <h1 className="mt-6 text-balance font-serif text-4xl font-black leading-[1.1] text-white drop-shadow-sm sm:text-5xl md:text-[3.5rem]">
              <span className="lg:block">Learn from someone who&apos;s</span>{" "}
              <span className="lg:block"><span className="brush-underline text-honey">gone ahead</span> of you.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85 text-justify">
              A warm, guided space where TELPSAM students and alumni meet. Every
              connection is introduced and cared for by the Program Coordinators —
              so wisdom is shared safely, and no one walks their path alone.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/join?role=student" className="btn bg-honey !px-6 !py-3.5 text-forest shadow-lg shadow-black/20 hover:bg-honey/90">
                <GraduationCap className="h-4 w-4" /> I&apos;m a student
              </Link>
              <Link href="/join?role=alumnus" className="btn !px-6 !py-3.5 text-white ring-1 ring-white/40 backdrop-blur hover:bg-white/10">
                <UserCheck className="h-4 w-4" /> I&apos;m an alumnus
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-2.5">
              {heroPills.map((p) => (
                <span key={p.label} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white/90 backdrop-blur">
                  <p.icon className="h-4 w-4 text-honey" /> {p.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Moving photo ribbon */}
      <section className="overflow-hidden border-y border-line bg-forest py-6">
        <div className="marquee-track gap-4">
          {[...ribbon, ...ribbon].map((img, i) => (
            <div key={i} className="relative h-40 w-60 shrink-0 overflow-hidden rounded-2xl sm:h-48 sm:w-72">
              <Image src={img.src} alt={img.alt} fill className="object-cover" sizes="288px" />
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay">How it works</p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-forest md:text-4xl">Mentorship, done with care</h2>
          <p className="mt-4 leading-relaxed text-body">
            You never cold-contact anyone. Every mentorship is introduced and watched
            over by the Program Coordinators, and each pairing runs for three months —
            long enough to open a door to someone you&apos;d never usually reach, without
            replacing the relationships already around you.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="rounded-3xl border border-line bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.tint}`}>
                <s.icon className="h-6 w-6" />
              </div>
              <p className="mt-4 text-xs font-bold text-clay">STEP {i + 1}</p>
              <h3 className="mt-1 font-serif text-lg font-bold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* A bridge, not a replacement */}
      <section className="bg-sand/60">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay">A bridge, not a replacement</p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-forest md:text-4xl">What this space is for</h2>
            <p className="mt-4 leading-relaxed text-body">
              This portal isn&apos;t here to replace the mentorship and relationships you
              already have. It exists to open a door to people you&apos;d struggle to reach
              on your own — and to make that access safe. Face-to-face mentorship,
              wherever it&apos;s possible, is still the goal.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Globe,
                title: "It bridges the distance",
                text: "It connects you with alumni you'd struggle to reach in person — across cities, industries, and generations — shortening a distance that would otherwise keep you apart.",
                tint: "bg-forest-soft text-forest",
              },
              {
                icon: HeartHandshake,
                title: "It complements, never replaces",
                text: "Your branch, chapter, and campus relationships stay primary. This doesn't replace the mentorship happening around you; it simply adds one you wouldn't otherwise have.",
                tint: "bg-clay-soft text-clay-600",
              },
              {
                icon: MapPin,
                title: "In person, whenever we can",
                text: "When the Coordinators know someone suitable is physically near you, they may propose an in-person mentorship instead — because presence, where it's possible, is always best.",
                tint: "bg-honey-soft text-honey-700",
              },
            ].map((c) => (
              <div key={c.title} className="rounded-3xl border border-line bg-white p-6 shadow-sm">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${c.tint}`}>
                  <c.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-serif text-lg font-bold text-ink">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-body">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:gap-12">
          <div className="relative order-2 lg:order-1">
            <div className="absolute -left-5 -top-5 h-24 w-24 rounded-3xl bg-honey-soft" aria-hidden />
            <div className="relative aspect-[5/4] overflow-hidden rounded-[2rem] border-4 border-white shadow-xl">
              <Image src={TESTIMONIAL_IMG} alt="A speaker at the TELPSAM conference" fill className="object-cover" sizes="(max-width: 1024px) 90vw, 520px" />
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <Quote className="h-9 w-9 text-clay" />
            <blockquote className="mt-4 font-serif text-2xl font-bold leading-snug text-forest text-balance">
              A generation blessed by the one before it.<br className="hidden sm:block" /> This is how we raise leaders.
            </blockquote>
            <p className="mt-5 leading-relaxed text-body">
              Mentorship at TELPSAM is intentional, protected, and rooted in care —
              a quiet handing-down of wisdom from those who have walked ahead.
            </p>
            <Link href="/rules" className="btn btn-forest-outline mt-7">
              See the Rules of Engagement <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Safeguards */}
      <section className="bg-sand/60">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay">Built on trust</p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-forest md:text-4xl">The care that keeps this safe</h2>
            <p className="mt-4 leading-relaxed text-body">
              This portal exists to help, not to expose. Students and alumni agree to
              clear rules of engagement before taking part, and the Program
              Coordinators hold everyone to them — gently, and consistently.
            </p>
            <ul className="mt-6 space-y-3">
              {safeguards.map((s) => (
                <li key={s} className="flex gap-3 rounded-2xl border border-line bg-white p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-forest" />
                  <span className="text-sm text-body">{s}</span>
                </li>
              ))}
            </ul>
            <Link href="/rules" className="btn btn-forest-outline mt-7">
              Read the full Rules of Engagement
            </Link>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border-4 border-white shadow-xl lg:aspect-auto lg:h-[560px]">
            <Image src={SAFE_IMG} alt="TELPSAM members together in the evening" fill className="object-cover" sizes="(max-width: 1024px) 90vw, 520px" />
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-cream px-5 py-20">
        <div className="grain relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-forest px-6 py-16 text-center text-white sm:px-12">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-honey/20 blur-2xl" aria-hidden />
          <div className="absolute -bottom-12 -left-8 h-48 w-48 rounded-full bg-clay/20 blur-2xl" aria-hidden />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-serif text-3xl font-bold leading-tight text-white md:text-4xl">
              Ready to learn from someone who&apos;s walked your path?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/80">
              Join the TELPSAM network today. A coordinator will help you find the
              right person to walk with.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/join?role=student" className="btn bg-honey !px-5 !py-3 text-forest hover:bg-honey/90">
                <GraduationCap className="h-4 w-4" /> Join as a student
              </Link>
              <Link href="/join?role=alumnus" className="btn bg-white/10 !px-5 !py-3 text-white ring-1 ring-white/30 hover:bg-white/20">
                <UserCheck className="h-4 w-4" /> Join as an alumnus
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-forest text-white/70">
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
