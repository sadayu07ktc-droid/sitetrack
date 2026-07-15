@echo off
REM ===== ดับเบิลคลิกเพื่อ deploy หน้าเว็บขึ้น Cloudflare Pages =====
cd /d "%~dp0"
echo.
echo   Deploying website to Cloudflare Pages...
echo.
call npx --yes wrangler pages deploy frontend --project-name=sitetrack --branch=main --commit-dirty=true
echo.
echo   ============================================================
echo    Done!  Live at: https://sitetrack-2gh.pages.dev
echo   ============================================================
echo.
pause
