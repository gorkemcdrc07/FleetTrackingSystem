# Dependency security review

Review date: 2026-08-07

`npm audit` reports 17 findings: 14 high, 3 moderate, 0 critical. The most relevant direct dependency findings are:

| Dependency | Usage | Status / action |
| --- | --- | --- |
| `xlsx` | Spreadsheet import/export | High; npm registry has no automatic fix. Treat imported files as untrusted, limit file size, and replace with a maintained parser in a dedicated migration. |
| `exceljs` | Spreadsheet export | High findings in transitive archive/unzip packages; no direct automatic fix. Keep export lazy-loaded and monitor upstream releases. |
| `concurrently` | Local development only | High transitive `shell-quote` DoS; not shipped as application runtime code. Replace or upgrade when an upstream fix is available. |
| `vite` / `@vitejs/plugin-react` | Build tooling | Moderate PostCSS advisory; production runtime is not a Vite development server. Upgrade when compatible fixed versions are published. |

Several high findings (`archiver`, `glob`, `rimraf`, `fstream`, `unzipper`, `brace-expansion`) are transitive paths under spreadsheet tooling. Running `npm audit fix --force` is intentionally prohibited because it can introduce breaking dependency changes without resolving the direct packages.

## Required controls

1. Accept spreadsheet files only from authenticated users.
2. Enforce file type and size limits before parsing.
3. Never evaluate formulas or executable content from imported workbooks.
4. Keep spreadsheet libraries lazy-loaded so vulnerable parser code is not part of the initial application path.
5. Re-run `npm audit` in a scheduled maintenance PR and after dependency updates.
6. Replace `xlsx` before exposing arbitrary public file uploads.
