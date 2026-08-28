"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Curated country list: Ghana first, then common diaspora. `min`/`max` are the
// allowed number of digits in the national number (without the country code or a
// leading 0). Extend this list as needed.
type Country = { code: string; name: string; dial: string; min: number; max: number };

const COUNTRIES: Country[] = [
  { code: "GH", name: "Ghana", dial: "233", min: 9, max: 9 },
  { code: "NG", name: "Nigeria", dial: "234", min: 10, max: 10 },
  { code: "TG", name: "Togo", dial: "228", min: 8, max: 8 },
  { code: "CI", name: "Côte d’Ivoire", dial: "225", min: 10, max: 10 },
  { code: "ZA", name: "South Africa", dial: "27", min: 9, max: 9 },
  { code: "GB", name: "United Kingdom", dial: "44", min: 10, max: 10 },
  { code: "US", name: "United States", dial: "1", min: 10, max: 10 },
  { code: "CA", name: "Canada", dial: "1", min: 10, max: 10 },
  { code: "DE", name: "Germany", dial: "49", min: 10, max: 11 },
  { code: "FR", name: "France", dial: "33", min: 9, max: 9 },
  { code: "NL", name: "Netherlands", dial: "31", min: 9, max: 9 },
  { code: "IT", name: "Italy", dial: "39", min: 9, max: 10 },
  { code: "AE", name: "United Arab Emirates", dial: "971", min: 9, max: 9 },
];

// Parse an existing "+<dial><national>" value into a country + national number.
function parse(value: string): { country: Country; national: string } {
  const v = (value || "").replace(/[^\d+]/g, "");
  if (v.startsWith("+")) {
    const digits = v.slice(1);
    // Longest dial code first so +233 beats +2, etc.
    const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
    for (const c of sorted) {
      if (digits.startsWith(c.dial)) {
        return { country: c, national: digits.slice(c.dial.length) };
      }
    }
  }
  return { country: COUNTRIES[0], national: "" };
}

export default function PhoneInput({
  name,
  defaultValue = "",
  required = false,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const parsed = useMemo(() => parse(defaultValue), [defaultValue]);
  const [countryCode, setCountryCode] = useState(parsed.country.code + ":" + parsed.country.dial);
  const [national, setNational] = useState(parsed.national);

  const country =
    COUNTRIES.find((c) => c.code + ":" + c.dial === countryCode) || COUNTRIES[0];

  const digits = national.replace(/\D/g, "");
  const valid = digits.length >= country.min && digits.length <= country.max;
  const combined = valid ? `+${country.dial}${digits}` : "";

  const hint =
    country.min === country.max
      ? `${country.min} digits`
      : `${country.min}–${country.max} digits`;

  // Block form submission natively until the number is valid.
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    if (!required && national.length === 0) {
      el.setCustomValidity("");
    } else {
      el.setCustomValidity(valid ? "" : `Enter a valid ${country.name} phone number (${hint}).`);
    }
  }, [national, valid, required, country.name, hint]);

  return (
    <div>
      {/* Submitted value; empty (so validation fails) until the number is valid. */}
      <input type="hidden" name={name} value={combined} />

      <div className="flex gap-2">
        <div className="w-28 shrink-0 sm:w-40">
          <select
            className="field"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            aria-label="Country code"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code + c.dial} value={c.code + ":" + c.dial}>
                {c.name} (+{c.dial})
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <input
            ref={inputRef}
            className="field"
            type="tel"
            inputMode="numeric"
            required={required}
            value={national}
            onChange={(e) => setNational(e.target.value.replace(/[^\d\s-]/g, ""))}
            placeholder="Phone number"
            aria-invalid={national.length > 0 && !valid}
          />
        </div>
      </div>
      <p className={`mt-1 text-xs ${national.length > 0 && !valid ? "text-danger" : "text-muted"}`}>
        {national.length > 0 && !valid
          ? `Enter a valid ${country.name} number (${hint}). Don’t include a leading 0.`
          : `Enter your number without the leading 0 (${hint}).`}
      </p>
    </div>
  );
}
