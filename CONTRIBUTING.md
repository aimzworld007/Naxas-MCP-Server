# Contributing

Contributions are welcome.

1. Fork the repository and create a focused branch.
2. Keep database URLs and secrets out of commits and test fixtures.
3. Preserve server-side database URL allowlisting, owner-managed project policies, per-user grants, and compatibility with separate read/write roles.
4. Do not weaken blocked SQL classes without a documented security rationale.
5. Run `npm ci` and `npm run check` before opening a pull request.
6. Explain security implications for changes to authentication, SQL policy, database roles, or tool annotations.

Small, reviewable pull requests are preferred.
The repository owner reviews and merges pull requests. Do not include production database URLs, bearer tokens, or access-file contents in PRs.
