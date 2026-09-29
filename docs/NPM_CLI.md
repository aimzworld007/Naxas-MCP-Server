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

## Windows one-click release

When GitHub Actions cannot run, use [`publish-npm.bat`](../publish-npm.bat) from a clean Windows clone of this repository. The script pulls `main` with `--ff-only`, checks that the version is not already on npm, runs `npm ci` and `npm run check`, then publishes using your local npm login. It does **not** contain or request an npm token. npm may prompt for a second factor during publish.

First, commit a new version to GitHub in `package.json`, `package-lock.json`, `src/cli.ts`, and `src/server.ts`. Each npm release needs a unique version. Then double-click `publish-npm.bat` in the Windows clone, or run it from PowerShell:

```powershell
.\publish-npm.bat
```

For a Desktop shortcut, copy [`launch-publish-npm.bat`](../launch-publish-npm.bat) to your Desktop. Double-clicking it runs the publisher from `%USERPROFILE%\Naxas-MCP-Server-release`; keep the Git clone at that path.

If the script reports that login is needed, run `npm login --auth-type=web` in PowerShell, then start the script again. It stops on local changes, wrong branch/repository, pull failure, an existing npm version, failed tests/build, or failed publish. Check `npm view naxas-mcp version --prefer-online` after npm finishes processing.

Do not put npm tokens in the batch file or GitHub. The script uses the credentials maintained by the npm CLI on your Windows account.

## Automatic release from GitHub (optional)

If GitHub Actions is available on the account, the workflow [`npm-publish.yml`](../.github/workflows/npm-publish.yml) publishes the package when a **non-prerelease GitHub Release** is published. Ordinary commits and pull requests do not publish. It uses npm Trusted Publishing (OIDC), so no long-lived `NPM_TOKEN` GitHub secret is needed. If Actions is blocked, use the Windows script above.

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

The workflow stops before publishing if the release tag differs from `package.json`. npm cannot publish the same package version twice. Check the current published version with `npm view naxas-mcp version --prefer-online` before preparing a release.

For version 1.0.0, merge the reviewed version bump into `main`, run the Windows script above from a clean clone, and verify `npm view naxas-mcp@1.0.0 version --prefer-online`. Use the GitHub Release workflow only if Trusted Publishing and GitHub Actions are available. Do not run both publishing routes for the same version.

Manual `npm publish --access public` remains available to an authenticated package maintainer when needed.

## Release safety

Never publish:

- `.env`
- database passwords
- production bearer tokens
- private connection URLs
- deployment-specific secrets

The package `files` allowlist limits published content to compiled code and public documentation/deployment assets.
