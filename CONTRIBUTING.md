# Contributing

Contributions are welcome.

1. Fork the repository and create a focused branch.
2. Keep database URLs and secrets out of commits and test fixtures.
3. Preserve the server-side project allowlist and read/write role separation.
4. Do not weaken blocked SQL classes without a documented security rationale.
5. Run `npm install`, `npm run typecheck`, and `npm run build` before opening a pull request.
6. Explain security implications for changes to authentication, SQL policy, database roles, or tool annotations.

Small, reviewable pull requests are preferred.
