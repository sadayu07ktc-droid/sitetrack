@echo off
REM ===== ดับเบิลคลิกเพื่อ deploy backend (Code.gs) ขึ้น Google Apps Script =====
REM ใช้ --deploymentId เดิม เพื่อให้ URL /exec ไม่เปลี่ยน (frontend จะได้ไม่หลุด)
cd /d "%~dp0"
cd backend
echo.
echo   Pushing Code.gs to Google Apps Script...
echo.
call npx --yes @google/clasp@2.4.2 push -f
echo.
echo   Deploying (keep same URL)...
call npx --yes @google/clasp@2.4.2 deploy --deploymentId AKfycbz_Zf3K3YxBoj4DBY8LgzLALkSFgxb98mIxcFHEEV0wVGh4-ZJfyMMefaeiq_1Ey5Cf7A --description "manual deploy"
echo.
echo   ============================================================
echo    Done!  Backend updated (same URL kept).
echo   ============================================================
echo.
pause
