"use client";

import { useState } from "react";
import { branchRegions, OTHER_BRANCH, allBranches } from "@/data/branches";

// Church-branch picker: a grouped dropdown of known branches plus an "Other"
// option that reveals a free-text field so members can enter a branch not yet
// on the list. Submits a single `church_branch` value in the form.
export default function BranchSelect({
  name = "church_branch",
  defaultValue = "",
  required = false,
}: {
  name?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const known = defaultValue && allBranches.includes(defaultValue);
  const [selected, setSelected] = useState(
    defaultValue ? (known ? defaultValue : OTHER_BRANCH) : ""
  );
  const [other, setOther] = useState(known ? "" : defaultValue);

  const isOther = selected === OTHER_BRANCH;

  return (
    <div className="space-y-2">
      {/* The real submitted value */}
      <input type="hidden" name={name} value={isOther ? other : selected} />

      <select
        className="field"
        required={required}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="" disabled>
          Select your branch…
        </option>
        {branchRegions.map((r) => (
          <optgroup key={r.region} label={r.region}>
            {r.branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={OTHER_BRANCH}>Other (not listed)</option>
      </select>

      {isOther && (
        <input
          className="field"
          placeholder="Type your church branch"
          value={other}
          required={required}
          onChange={(e) => setOther(e.target.value)}
        />
      )}
    </div>
  );
}
