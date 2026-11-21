@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>&1
if not errorlevel 1 (
  py "%~dp0start_control_lab.py"
  goto finished
)
where python >nul 2>&1
if not errorlevel 1 (
  python "%~dp0start_control_lab.py"
  goto finished
)
echo Python was not found. Install Python, then launch this file again.
pause
:finished
endlocal