# HubSpot account signals: source-level regression checks

From the repository root, with Node.js 18 or newer:

```sh
node workflows/hubspot-account-signals/review/check-company-match.cjs
node workflows/hubspot-account-signals/review/check-branch-outputs.cjs
```

Expected: **6/6 matching cases passed** and **13/13 branch cases passed**, each with exit code 0. A mismatch prints the expected and actual fields and exits 1. Both commands need no packages, n8n installation, credentials, server or network connection, and write no files.

[GitHub Actions](../../../.github/workflows/hubspot-account-signals-contracts.yml) runs these same two commands on Node.js 22 for pull requests and pushes to `main` that change this workflow/review folder or the CI file. The PR check is **Source contracts (6 matching + 13 branch)**; a mismatch fails its corresponding step. Scope remains source-level checks with local fixtures.

## Company matching: six cases

The check reads the **current `../workflow.json`** on every run. It executes the source of `Normalize event`, the `Find HubSpot company` request expression, and `Resolve CRM match`. The local HubSpot fixture applies the request's OR filter groups, EQ predicates, property selection and limit before resolution. Matching logic is taken from the workflow; it is not copied into the check.

[`fixtures.json`](fixtures.json) contains the same six independent synthetic inputs and expected outputs used for the original fix:

1. An entity-ID match wins over a different company with the same name.
2. With no ID match, one exact-name company is accepted.
3. No results go to review.
4. Two exact-name companies go to review.
5. A missing entity ID plus an unrelated company whose ID property is the literal `none` goes to review, with empty company/owner IDs.
6. A missing entity ID with one actual exact-name company is accepted.

All cases use HIGH-confidence funding events. Expected fields follow the workflow README's ID-first / unique-name / review policy. Each case starts with fresh workflow static data.

This is a source-level matching regression, covering the three boundaries above. Full n8n execution, HTTP-node behavior, note/task writes, live HubSpot data and owner-environment validation are separate checks. The existing native before/after evidence remains linked from [PR #1](https://github.com/evinor-ai/evinor-n8n-workflows/pull/1).

The fixtures are preserved unchanged from the original [review evidence](https://github.com/blucca/evinor-n8n-workflows/blob/cdd47ff899dab0405d7f750a30ec392f0b4b4f8d/workflows/hubspot-account-signals/review/fixtures.json). Workflow copyright (c) 2026 Evinor; fixtures and check contributed by Blucca under this repository's [MIT license](../../../LICENSE.md).

## Slack, Sheets and daily digest: thirteen cases

[`branch-fixtures.json`](branch-fixtures.json) contains fictional raw Evinor deliveries, local CRM companies and explicit expected messages/rows. The routing and thirteen sheet headers follow the [workflow README](../README.md); cell values and message details come from those payloads. The fixed clock is `2026-11-18T08:00:00.000Z` and every case starts with fresh workflow static data.

- **Review Slack (7):** LOW, MEDIUM, missing company, no match, ambiguous match, owned layoff, and the `[test delivery]` label. Each checks the complete channel/text and the path selected by the actual IF/Switch conditions and connections. The review text shows the Evinor entity ID to paste into HubSpot, or `unavailable` when absent.
- **Lead Sheets (2):** an unowned matched company reaches append with all thirteen named cells, and a second row preserves numeric zero, blank cells and an estimated month. Exact paths also verify that review/lead cases reach no timeline-note/task nodes. The current Sheets append/auto-map configuration is checked; spreadsheet/sheet selectors remain unset in this template.
- **Daily digest (4):** empty returns zero items; non-test deliveries buffer while editor tests are excluded; exactly forty events have no remainder; forty-two show the first forty plus `…and 2 more`. Complete Slack text uses real newlines. Each checks the buffer is cleared **before posting** and a second build returns zero items.

The runner reads the current Normalize, search expression, Resolve, Shape lead row and Build digest source, plus IF/Switch, Slack/Sheets configuration and connections on every invocation. As in the six-case check, search responses come from a local OR/EQ/limit fixture. Expression rendering supports only this template's current forms; changed forms require an explicit checker update.

On Node v26.12.0, the pre-change workflow at `02bc8d4` produced **6/13**, exit 1: seven review messages omitted the entity-ID line promised by the workflow README. Adding that line is the only production-source change; the same expected fixtures then produced **13/13**, exit 0, with the original matching check still **6/6**. An isolated wrong-column control (`Company` → `Wrong company header`) produced **11/13**, exit 1, failing both lead-row cases. Digest eval confirmed real LF bytes in the original source, so its code remains unchanged.

Scope is source-level output/routing regression. n8n engine execution, item-linking behavior, native Slack/Sheets delivery, active-workflow static-data persistence and live API writes require separate integration checks. The existing clear-on-build policy is preserved: a failed Slack post still loses the built digest, as described in the workflow README. The owner previously ran the matching check on Node v22.23.4; running the new branch command in that environment is the next validation.
