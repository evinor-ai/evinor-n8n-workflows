# Company matching: six-case regression check

From the repository root, with Node.js 18 or newer:

```sh
node workflows/hubspot-account-signals/review/check-company-match.cjs
```

Expected: **6/6 matching cases passed**, exit code 0. A mismatch prints the expected and actual matching fields and exits 1. The command needs no packages, n8n installation, credentials, server or network connection, and writes no files.

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
