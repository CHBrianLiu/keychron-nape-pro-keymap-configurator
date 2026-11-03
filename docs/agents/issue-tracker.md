# Issue tracker: Local Markdown

Issues and specs live as Markdown files in `.scratch/`.

## Conventions

- Feature directory: `.scratch/<feature-slug>/`.
- Spec: `.scratch/<feature-slug>/spec.md`.
- Implementation tickets: one file per ticket at
  `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`.
- Triage state: a `Status:` line near the top of each issue,
  using the roles in [triage-labels.md](triage-labels.md).
- Comments: append under a `## Comments` heading.

## Publish or fetch

When a skill says "publish to the issue tracker", create the appropriate
spec or ticket file using the paths above.

When a skill says "fetch the relevant ticket", read the referenced file.
If a ticket number matches multiple features, ask which feature.

## Wayfinding operations

- Map: `.scratch/<effort>/map.md`, containing Notes,
  Decisions-so-far, and Fog.
- Child tickets: `.scratch/<effort>/issues/<NN>-<slug>.md`.
  Include the question and a `Type:` line:
  `research`, `prototype`, `grilling`, or `task`.
- Lifecycle: `Status: open`, `Status: claimed`, or `Status: resolved`.
  These are wayfinding states, separate from triage roles.
- Blocking: `Blocked by: NN, NN` near the top.
  A ticket is unblocked when every listed ticket is resolved.
- Frontier: open, unblocked, unclaimed tickets, lowest number first.
- Claim: save `Status: claimed` before starting work.
- Resolve: append an `## Answer`, set `Status: resolved`, and append
  a summary and ticket link to the map's Decisions-so-far.
