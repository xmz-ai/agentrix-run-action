# agentrix-run-action

A thin public GitHub Action wrapper for `@agentrix/agentrix-run`.

This repository is intentionally small. It does not include Agentrix server or runner implementation. It only:

- accepts GitHub Action inputs
- invokes a pinned `@agentrix/agentrix-run` npm version
- exposes normalized outputs for later workflow steps

## Usage

```yaml
name: Agentrix

on:
  pull_request:

jobs:
  agentrix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - id: agentrix
        uses: xmz-ai/agentrix-run-action@v1
        with:
          base-url: https://agentrix.xmz.ai
          api-key: ${{ secrets.AGENTRIX_API_KEY }}
          agent: codex
          prompt: >-
            Review this PR and return one short summary sentence.

      - name: Print result
        run: |
          echo "run id: ${{ steps.agentrix.outputs.run-id }}"
          echo "status: ${{ steps.agentrix.outputs.status }}"
          echo "detail url: ${{ steps.agentrix.outputs.detail-url }}"
          echo "result: ${{ steps.agentrix.outputs.result }}"
```

## Structured Output

```yaml
      - id: agentrix
        uses: xmz-ai/agentrix-run-action@v1
        with:
          base-url: https://agentrix.xmz.ai
          api-key: ${{ secrets.AGENTRIX_API_KEY }}
          agent: codex
          prompt: >-
            Summarize this change.
          output-schema: >-
            {"type":"object","properties":{"summary":{"type":"string"}},"required":["summary"],"additionalProperties":false}

      - name: Read structured output
        run: |
          echo '${{ steps.agentrix.outputs.structured-output-json }}'
```

## Release Model

Keep the wrapper repo public and keep your main Agentrix monorepo private.

Release this repo with immutable and moving tags:

- `v0.1.0`
- `v0.1`
- `v1`

When releasing:

1. publish `@agentrix/agentrix-run@X.Y.Z`
2. sync `action.yml`, `run.mjs`, and `README.md` from the private monorepo
3. create immutable tag `vX.Y.Z`
4. move `vX.Y` and `v1` to the same commit

## Notes

- Do not use `npx @agentrix/agentrix-run` without a version pin.
- The wrapper should stay thin. Put product logic in Agentrix API and runners, not here.
- `api-key` should be provided through GitHub Actions secrets.
