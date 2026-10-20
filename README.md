# ScoutDesk: AI staffing / recruiting demo

A demo-ready prototype of an AI recruiting platform. A recruiter pastes a client's job description, and the app:

1. **Extracts structured requirements** (mandatory vs preferred, each with its supporting JD quote), removes discriminatory requirements (age, sex, religion, national origin, pregnancy, disability, marital status…) and asks clarification questions.
2. **Plans where to search**: internal pool and job board (active), plus **passive** sources: mock state licensing registry, Board of Accountancy, State Bar, professional associations, a professional data provider and an open-source source for tech roles.
3. **Finds and ranks active and passive candidates** with three separate scores (**Fit**, **Likely to move?** i.e. movability / interest, **Readiness**), a ✅ / ❌ / ❔ must-have checklist, and provenance on every fact (**VERIFIED / SELF-REPORTED / INFERRED**).
4. **Verifies licences** against a mock registry (which sometimes disagrees with the candidate), records confirmed interest, and builds a **shortlist** with a printable, client-safe **submission packet**.

It's occupation-agnostic. The 11 one-click samples cover accounting, tax, legal, construction estimating, nursing, electrical, HVAC, trucking and software.

> **Demo only.** No login, no database, no real data providers. All 351 candidates, employers, licence numbers and registry records are synthetic. The header shows this at all times.

---

## Run locally

Requirements: Node 20+ and npm.

```bash
npm install
cp .env.example .env.local      # optional: add ANTHROPIC_API_KEY to enable live AI
npm run dev                     # http://localhost:3000
```

Without an API key, everything still works: samples use hand-checked cached extractions, and every other AI step uses deterministic rules and templates. A small chip on each AI result shows which engine ran: **AI**, **Cached** or **Rules**. The header shows "Live AI on/off".

Other scripts:

| Command | What it does |
|---|---|
| `npm test` | Vitest unit tests: mandatory pass/fail/unknown, fit, movability, readiness, distance, plus the demo story on real data |
| `npm run build` | Production build (type-checks) |
| `npm run generate` | Regenerates `data/candidates.json`, `data/registry.json`, `data/samples/*.json` (fixed seed: same output every time) |
| `npm run check-data` | Verifies every sample has ≥ 8 active and ≥ 8 passive candidates with strong, partial and failing matches |
| `npx tsx scripts/smoke.ts` | End-to-end API walkthrough of all 11 samples against a running server |

### Environment variables

| Name | Required | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | No (demo falls back to rules) | — |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-5-5` |

The key is only read in server route handlers (`lib/ai/client.ts` is `server-only`) and never reaches the browser.

## Deploy to Vercel (recommended)

1. Push this folder to a GitHub repository.
2. In Vercel: **Add New… → Project → Import** the repository.
3. Framework preset: **Next.js** (auto-detected). Leave the build and output settings at their defaults.
4. **Environment Variables**: add `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`) for Production and Preview.
5. Click **Deploy**. You'll get a public URL like `https://<project>.vercel.app`.

AI routes set `maxDuration = 60`; each AI call has its own 25-second timeout and falls back to rules, so a slow model never hangs the demo.

## Deploy to Render (alternative)

The repo includes `render.yaml`, so Render can set it up as a Blueprint:

1. In Render: **New → Blueprint**, connect GitHub and pick this repository. Render reads `render.yaml` (Node web service, `npm ci && npm run build`, start `npm start`).
2. When asked, enter `ANTHROPIC_API_KEY` (optional) and click **Apply**.
3. Wait for the build, then open the `https://<service>.onrender.com` URL.

Or manually: **New → Web Service**, runtime **Node**, build command `npm ci && npm run build`, start command `npm start`, add the env vars. Note that Render's free plan sleeps after inactivity, so the first page load can take ~30–60 s. Open the URL a few minutes before presenting.

---

## 7-minute demo script

Before you start: open the app, click **Reset demo**, and use a 1280-px-wide window or a projector.

**0:00 · Intake (30 s)**
- Point out the amber badge, *"Demo data: synthetic candidates, mock sources"*.
- Click the **Controller** sample (Lone Star Freight Holdings, Dallas, TX). The form and JD fill in.
- Click **Extract requirements**.

**0:30 · Requirements (1 min 30 s)**
- The JD becomes a checklist: 7 **Must-haves** (mandatory) and 4 **Nice-to-haves** (preferred, collapsed). Each shows the JD sentence it came from; hover a row and that sentence lights up in the JD on the left. Use the pencil to edit, **→ Nice-to-have / → Must-have** to switch.
- Red card: *"Removed: possible discriminatory requirement (Age)"* for *"We prefer candidates under 45…"*. It's never used for matching.
- Clarification question 1, *"Is an active CPA license required on day one?"*: click **"Yes, required on day one"**.
- Click **Approve and continue** to lock v1 and move on. *(Optional: come back, switch a nice-to-have to must-have, click **What changed?**, then **Approve as v2**.)*
- *(If live AI is on: **Re-run with AI** shows live extraction. The chip changes from Cached to AI.)*

**2:00 · Source plan, the differentiator (1 min)**
- Two columns: **green = Active** (internal pool, job board: people who are applying) and **purple = Passive** (Board of Accountancy, Professional Data Provider: people who are *not* looking). Sources not needed for this job are tucked under *"Other sources not needed for this job"*.
- *"What it can verify / known gaps"* opens the details; e.g. the data provider is *"INFERRED, not verified"*.
- Click **Run discovery**. Each source animates and shows *"Found N"*. Then click **Next: see candidates**.

**3:00 · Candidates (2 min 30 s)**
- 24 candidates: 13 active and 11 passive. Show the **Passive** tab, then the three score columns (**Fit**, **Likely to move?**, **Readiness**), hovering the ⓘ tooltips. Tick **Checklist** to show the ✅/❌/❔ must-have icons.
- #1 is **Derek Holloway**, an active applicant with a perfect-looking profile who *says* his CPA is active.
- #2 is **Priya Raman**, *passive* and found only through the data provider: Corporate Controller at Pecan Street Capital, 2 miles away. Signals: 5.6 years in the job, her employer announced layoffs, and she updated her profile 14 days ago. **She would never have shown up among applicants.**
- Open **Priya Raman**:
  - Explanation and screening questions are built only from her record.
  - Her facts are INFERRED. Readiness is *Needs verification*.
  - Click **Verify Certified Public Accountant**. The registry confirms: *"Mock TX State Board of Public Accountancy · #… · Active · expires …"*. The licence becomes VERIFIED.
  - Click **Mark interest confirmed** (simulates the recruiter's call). "Likely to move?" becomes Confirmed, inferred facts become confirmed, and readiness turns **Ready**.
  - Click **Accept**.
- Open **Derek Holloway** and click **Verify**. The registry says *"Lapsed: CPE reporting not completed"*, so he turns **Blocked**. *This is why verification matters.* Click **Reject** and pick "Licence / credential issue".
- Optional: **Elena Vasquez** shows *"Found in 2 sources"* (internal pool + data provider, merged into one profile). **Tom Okafor** shows ❔ unknowns and screening questions that cover only those gaps. **Marcus Bell** is already Ready (internal, recruiter-confirmed). Accept him too.

**5:30 · Shortlist and packet (45 s)**
- Click **Shortlist**. Priya and Marcus are Ready. Click **Generate submission packet** to get a one-page client summary with no contact details, built only from verified and candidate-provided facts.
- Click **Print / Download PDF** (browser print → Save as PDF).
- A Blocked or Needs-verification candidate's button is locked and shows the reasons.

**6:15 · Any occupation (45 s)**
- Click **Dashboard**: records per source, active vs passive, how many pass all mandatory criteria, how many are Ready.
- Click **Reset demo** and load **Corporate Attorney** (Charlotte). The guardrail removes a religion requirement. In candidates, **Nathan Price** (passive, State Bar good standing) is a top match, while **Victoria Lang** (active) shows *Inactive: CLE requirements not met* after verification.
- Mention that ICU Nurse, Electrician, HVAC, CDL-A and Backend Engineer samples run the same flow.

### Named candidates per sample (for improvising)

| Sample | Passive star (top passive match) | "Registry disagrees" | Already Ready | Found in 2 sources |
|---|---|---|---|---|
| Controller (Dallas) | Priya Raman | Derek Holloway (CPA lapsed) | Marcus Bell | Elena Vasquez |
| Senior Accountant (Chicago) | Grace Kim | Ryan Novak (CPA lapsed, preferred) | Aisha Thompson | Luis Ortega |
| Tax Manager (Houston) | Daniel Nguyen | Brittany Cole (CPA lapsed) | Omar Haddad | Rachel Stein |
| Litigation Paralegal (Atlanta) | Jasmine Carter | Megan Russo (NALA CP expired, preferred) | Tiana Brooks | Carlos Mendez |
| Corporate Attorney (Charlotte) | Nathan Price | Victoria Lang (bar inactive) | Samuel Adeyemi | Laura Pennington |
| Construction Estimator (Phoenix) | Miguel Alvarez | Scott Brennan (CPE expired, preferred) | Kayla Morgan | Ahmed Siddiqui |
| ICU RN (Houston) | Maria Santos | Jessica Palmer (RN inactive) | Andre Washington | Linh Pham |
| Journeyman Electrician (Denver) | Cody Ramirez | Travis Keller (licence expired) | DeShawn Harris | Erik Johansson |
| HVAC Technician (Austin) | Jose Guerrero | Brandon Lee* | Tyler Reed | Hector Morales |
| CDL-A Driver (San Antonio) | Ray Delgado | Curtis Boyd (CDL suspended) | Lamar Jenkins | Frank Medina |
| Backend Engineer (Austin) | Anika Patel | — (no licence) | Wei Zhang | Sofia Rossi |

\* HVAC's mandatory EPA 608 card has no state registry, so the registry check applies to the preferred TDLR registration. For HVAC and CDL, passive candidates stay *Needs verification* even after verify and confirm, because the clean-driving-record (MVR) requirement is unknown until a background check runs. That's intentional and realistic.

---

## How it works

### Reliability
- **Every AI step has a deterministic fallback** (`lib/ai/fallbacks.ts`): keyword/rule extraction, template questions, explanations, screening questions and packets. The fallback runs silently when the key is missing, the call fails or times out (> 25 s), the model refuses, or output fails zod validation.
- **Samples are fully offline**: each sample JD ships with a hand-checked extraction (`scripts/sample-defs.ts` → `data/samples/*.json`). If **Re-run with AI** fails, the cached result is used.
- **Grounding checks**: AI explanations and packets are rejected (and the template used) if they contain numbers that aren't in the candidate record, contact details or protected traits. Extracted quotes are matched back to the JD.
- **Guardrail**: protected-trait requirements are removed before matching, whether the extraction came from AI or rules (`lib/ai/guardrail.ts`). Clarification answers that mention protected traits are not applied.
- Session state (job, criteria versions, verifications, decisions) lives in React state plus `localStorage`, wrapped in try/catch so it works in private windows too.

### Matching (pure functions in `lib/matching/`, unit-tested)
- **Criteria check** (`criteria.ts`): skills and tools by synonym map (`synonyms.ts`, per occupation family); years of experience from work history, with overlapping roles merged and filtered by domain (e.g. "managing accounting teams"); licences with state, expiry, compact/multistate and equivalents; education level and field; haversine distance with ~60 US cities and ZIP prefixes; schedule conflicts; language; physical; background. **Missing data = UNKNOWN**, never a pass and never a fail.
- **Fit** (`fit.ts`): mandatory criteria carry 75% of the score, preferred 25%. Unknown gets partial credit, and any mandatory fail caps fit at 49.
- **Movability** (`movability.ts`): confirmed interest > applied < 90 days > historical late-stage > passive with signals > passive with no signal.
- **Readiness** (`readiness.ts`): Ready = all mandatory met, registry-verifiable licences verified, no mandatory evidence that's only inferred, and interest confirmed. Any mandatory fail = Blocked.
- **Ranking**: fit, then readiness, then movability. Each column is sortable.
- **Duplicates** (`pipeline.ts`): records with the same `personKey` from different sources are merged, with a "Found in 2 sources" badge.

### Synthetic data
`scripts/generate-candidates.ts` (seeded) builds per-sample candidate clusters from archetypes: ready, strong applicant, licence mismatch, expired licence, short tenure, unknowns, historical finalist, far away, willing to relocate, junior, schedule/state/degree conflict, passive star, passive verified via registry, passive with no signals, thin profile, adjacent title, and a duplicate pair. It adds background candidates across ~15 metros and a warehouse/admin family. `data/registry.json` includes deliberate mismatches (lapsed CPA, inactive bar, suspended CDL, expired licences).

### Project layout
```
app/                 page + API route handlers (extract, clarify, explain, screening, packet, source-plan, registry, candidates, health)
components/          AppShell, steps/*, CandidateDrawer, PacketView, scores, ui
lib/ai/              Anthropic client, prompts, zod schemas, fallbacks, guardrail, grounding
lib/matching/        criteria, fit, movability, readiness, distance, synonyms, sources, pipeline
lib/data/            types, sample + data loaders
data/                candidates.json, registry.json, samples/*.json (generated, committed)
scripts/             generate-candidates.ts, sample-defs.ts, gen-specs.ts, check-data.ts, smoke.ts
tests/               Vitest
```
