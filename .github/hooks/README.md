# Local-only hook configuration

GitHub-hosted Copilot tasks run in an environment that does not provide the
`context-mode` CLI. Tracking `.github/hooks/context-mode.json` in this
repository caused every Copilot tool call to fail before execution.

If you use `context-mode` locally, create `.github/hooks/context-mode.json`
manually and keep it untracked.
