# Codex review operating rules

Claude Code owns primary design and implementation. Codex is the independent
review, verification, and root-cause investigation side.

For implementation handoffs, the parent Codex agent must inspect the real Git
diff, surrounding code, repository guidance, configuration, and available test
evidence. Treat both Claude Code's explanation and subagent reports as claims
that require direct evidence.

Use only the necessary project agents. The roster mirrors Claude Code's
`.claude/agents/` set so both sides share one vocabulary:

- Delegate codebase impact and dependency mapping to `codebase-explorer`.
- Delegate correctness AND security review to `reviewer-security` — a single
  combined reviewer covering behavioral correctness, regressions, async races,
  and the security surface (authentication, authorization, OAuth, Supabase RLS,
  APIs, sessions, user or database data, secrets, privacy, validation,
  redirects, duplicate submission, idempotency). Always use it whenever any of
  that security surface is touched.
- Delegate coverage, typecheck, lint, build, and failure-log analysis to
  `test-log-investigator`.
- Use `focused-fixer` only when the user explicitly asks Codex to edit code.
  It must be the only editing agent and must receive an explicit file scope.
  (This is Codex's write-side counterpart to Claude Code's `implementation-worker`;
  on the Codex side it stays review-only and runs only on explicit request.)

Read-only investigations may run in parallel. Wait for all requested reports,
compare them, and independently re-check conflicts and every retained finding.
Do not allow recursive subagent spawning or concurrent edits.

Prioritize real failures, security, data loss or disclosure, specification
violations, regressions, missing meaningful tests, future operational hazards,
maintainability, then minor readability. Do not inflate severity or report
style preferences as defects.

Final implementation reviews must begin with one conclusion:
`マージ可能`, `軽微な修正後にマージ可能`, `要修正`, `重大な問題あり`, or
`確認不足により判断保留`.

Then include the parent assessment, agent/model assignments and results,
evidence-backed findings with exact locations and triggering conditions,
non-issues that were investigated, commands and test results, unverified items,
and a directly reusable Claude Code correction packet. The correction packet
must state required fixes and evidence, scoped files, recommended approach,
out-of-scope files, required tests, rejected findings, and what Codex should
re-review.
