@echo off
setlocal
set "PUBLISHER=%USERPROFILE%\Naxas-MCP-Server-release\publish-npm.bat"

if not exist "%PUBLISHER%" (
  echo Naxas MCP publisher was not found:
  echo %PUBLISHER%
  echo.
  echo Check that the Git clone is in your user folder.
  pause
  exit /b 1
)

call "%PUBLISHER%"
exit /b %errorlevel%
