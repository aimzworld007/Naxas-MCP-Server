# npm CLI Release

Naxas MCP can be distributed as the public npm package `naxas-mcp`.

## User install

Without a global install:

```bash
npx naxas-mcp init
```

Global install:

```bash
npm install -g naxas-mcp
naxas-mcp init
```

## Run on localhost

For local PostgreSQL, Docker PostgreSQL, and VPS-private PostgreSQL setup details, see [LOCALHOST.md](LOCALHOST.md).

## Automatic release from GitHub

The workflow [`npm-publish.yml`](../.github/workflows/npm-publish.yml) publishes the package when a **non-prerelease GitHub Release** is published. Ordinary commits and pull requests do not publish. It uses npm Trusted Publishing (OIDC), so no long-lived `NPM_TOKEN` GitHub secret is needed.

### One-time npm account setup

On [the npm package page](https://www.npmjs.com/package/naxas-mcp), open **Settings → Trusted publishing → Add trusted publisher → GitHub Actions**. Enter these exact values:

| npm field | Value |
| --- | --- |
| Organization or user | `aimzworld007` |
| Repository | `Naxas-MCP-Server` |
| Workflow filename | `npm-publish.yml` (filename only) |
| Environment name | Leave empty |
| Allowed actions | Enable direct `npm publish` |

Only a package owner can link the npm package to the GitHub workflow. The workflow uses a GitHub-hosted runner, Node 24, npm 11, and `id-token: write`. See [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/).

### Each release

1. Update `package.json`, the CLI version in `src/cli.ts`, and the MCP/server versions in `src/server.ts` to the **same new version**. Update `package-lock.json` with `npm install --package-lock-only`. Commit and push the changes to `main`.
2. Verify `npm ci`, `npm run check`, and `npm pack --dry-run`. The package must include `dist/cli.js`, `dist/server.js`, and intended docs.
3. In GitHub, create a Release from the verified commit with tag `v<version>` (for example, `v0.5.5` for package version `0.5.5`) and **Publish release**.
4. Check [GitHub Actions](https://github.com/aimzworld007/Naxas-MCP-Server/actions) for the **Publish to npm** run, then verify `npm view naxas-mcp version`.

The workflow stops before publishing if the release tag differs from `package.json`. npm cannot publish the same package version twice. Version `0.5.4` was already published manually; the first automated release must use a newer version. Do not create a new `v0.5.4` release to test this workflow.

Manual `npm publish --access public` remains available to an authenticated package maintainer when needed.

## Release safety

Never publish:

- `.env`
- database passwords
- production bearer tokens
- private connection URLs
- deployment-specific secrets

The package `files` allowlist limits published content to compiled code and public documentation/deployment assets.
