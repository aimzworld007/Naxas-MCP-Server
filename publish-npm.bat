@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"

echo Naxas MCP npm release
echo =====================
echo Script folder: %CD%

where git >nul 2>nul
if errorlevel 1 (
  echo ERROR: Git is not available on PATH.
  goto :failed
)
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not available on PATH.
  goto :failed
)
where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm is not available on PATH.
  goto :failed
)

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo ERROR: This file is outside a Git clone. Use the file in the root of
  echo your Naxas-MCP-Server-release Git clone after pulling the repository.
  goto :failed
)

set "BRANCH="
for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "BRANCH=%%B"
if not defined BRANCH (
  echo ERROR: Git has no active branch, or this is a detached checkout.
  echo Run "git status" in the script folder and switch to main.
  goto :failed
)
if not "%BRANCH%"=="main" (
  echo ERROR: Check out the main branch before publishing. Current: %BRANCH%
  goto :failed
)

set "ORIGIN="
for /f "delims=" %%R in ('git remote get-url origin 2^>nul') do set "ORIGIN=%%R"
echo %ORIGIN% | findstr /I /C:"aimzworld007/Naxas-MCP-Server" >nul
if errorlevel 1 (
  echo ERROR: This is not the expected Naxas MCP GitHub repository.
  goto :failed
)

set "DIRTY="
for /f "delims=" %%S in ('git status --porcelain') do set "DIRTY=1"
if defined DIRTY (
  echo ERROR: Local changes found. Commit or move them before publishing.
  git status --short
  goto :failed
)

echo.
echo Pulling main from GitHub...
git pull --ff-only origin main
if errorlevel 1 goto :failed

set "VERSION="
for /f "delims=" %%V in ('node -p "require('./package.json').version"') do set "VERSION=%%V"
if not defined VERSION (
  echo ERROR: Could not read package version.
  goto :failed
)
echo Package version: %VERSION%

echo.
echo Checking npm authentication...
call npm whoami --registry=https://registry.npmjs.org/
if errorlevel 1 (
  echo ERROR: npm login is required. Run: npm login --auth-type=web
  goto :failed
)

echo Checking whether this version is already published...
call npm view naxas-mcp version --registry=https://registry.npmjs.org/ --prefer-online >nul
if errorlevel 1 (
  echo ERROR: Could not reach the npm registry.
  goto :failed
)
call npm view "naxas-mcp@%VERSION%" version --registry=https://registry.npmjs.org/ --prefer-online >nul 2>nul
if not errorlevel 1 (
  echo ERROR: naxas-mcp@%VERSION% already exists on npm. Increase the version in GitHub first.
  goto :failed
)

echo.
echo Installing locked dependencies...
call npm ci
if errorlevel 1 goto :failed

echo Validating source, tests, and build...
call npm run check
if errorlevel 1 goto :failed

echo Publishing naxas-mcp@%VERSION%...
call npm publish --access public --registry=https://registry.npmjs.org/
if errorlevel 1 goto :failed

echo.
echo npm accepted naxas-mcp@%VERSION%. Registry visibility can take a few minutes.
pause
exit /b 0

:failed
echo.
echo Publish stopped. If the publish step started, check npm before retrying.
pause
exit /b 1
