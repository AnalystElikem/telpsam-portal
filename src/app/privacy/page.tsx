import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How the TELPSAM portal collects, uses, and protects personal data.",
};

const sections = [
  {
    heading: "1. Who this covers",
    body: [
      "This policy explains how the TELPSAM Alumni & Mentorship Portal handles the personal data of students, alumni, and Program Coordinators. By using the portal you agree to this policy.",
    ],
  },
  {
    heading: "2. What we collect",
    body: [
      "From everyone: name, email, gender, phone number, and church branch.",
      "From students: school, level of education and class, and a parent or guardian's name and phone number.",
      "From alumni: professional details such as graduation year, role, organisation, industry, qualifications, and a short bio.",
      "Automatically: messages you send inside the portal, mentorship pairings, reports and flags, and basic activity needed to run the service.",
    ],
  },
  {
    heading: "3. Why we collect it",
    body: [
      "To run the mentorship programme: to verify members, match mentees with mentors, and let matched pairs communicate safely inside the portal.",
      "To keep everyone safe: to detect and review breaches of the Rules of Engagement, and to reach a parent or guardian if there is ever a concern about a student.",
    ],
  },
  {
    heading: "4. Who can see your information",
    body: [
      "Phone numbers and parent or guardian details are private to the Program Coordinators. They are never shown to other members or published in the directory.",
      "A phone number is only ever shared by a coordinator to arrange an approved phone call between a mentor and mentee, after either of them requests one. Numbers are never exchanged directly inside the portal.",
      "Conversations are private. Coordinators do not read mentorship chats unless a conversation is flagged automatically or someone files a report.",
      "Only the information an alumnus chooses to publish appears in the student-facing directory. Email addresses and phone numbers are never published.",
      "Coordinator access to flagged conversations and other sensitive actions is recorded in an internal audit log for accountability.",
    ],
  },
  {
    heading: "5. Students and guardians",
    body: [
      "The programme is open to SHS 3 and above. Because some students are minors, we collect a parent or guardian contact, and a coordinator confirms guardian consent before a student is approved.",
    ],
  },
  {
    heading: "6. How long we keep it, and deletion",
    body: [
      "We keep your data while your account is active. You can ask the Program Coordinators to delete your account and data at any time.",
      "Deletion is carried out under a two-coordinator process and permanently removes your profile, messages you sent, and related records. Limited audit records of coordinator actions may be retained for safeguarding and accountability.",
    ],
  },
  {
    heading: "7. Your rights",
    body: [
      "You can view and correct your details at any time from your profile.",
      "You can download a copy of your data from your profile (“Download my data”).",
      "You can request deletion by contacting the Program Coordinators.",
    ],
  },
  {
    heading: "8. Security",
    body: [
      "Access to data is restricted by role and protected by database-level security rules. Sensitive fields such as phone numbers are stored so they are not exposed to other members.",
    ],
  },
  {
    heading: "9. Contact",
    body: [
      "For any privacy question or request, speak with your TELPSAM Program Coordinators.",
    ],
  },
];

export default function PrivacyPage() {
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
        <p className="eyebrow">Privacy</p>
        <h1 className="mt-3 font-serif text-4xl font-bold text-ink">Privacy Policy</h1>
        <p className="mt-4 leading-relaxed text-body">
          We take the privacy of students and alumni seriously. This explains what
          we collect and how it is used and protected.
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
          <Link href="/terms" className="btn btn-outline">Terms of Use</Link>
        </div>
      </main>
    </div>
  );
}
