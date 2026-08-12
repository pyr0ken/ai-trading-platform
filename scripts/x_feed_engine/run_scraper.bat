@echo off
REM X Feed Engine — Automatic Scraper Runner
REM Runs every 2 hours via Windows Task Scheduler

cd /d "C:\Users\Lenovo\Desktop\Trade\market-data-ai-analyzer\x_feed_engine"

REM Kill any orphan chrome processes from previous crashes
taskkill /F /IM chrome.exe /T 2>nul
taskkill /F /IM chrome-headless-shell.exe /T 2>nul

REM Run scraper with existing session (no interaction)
.venv\Scripts\python.exe main.py --non-interactive --auth-mode existing --export-age-hours 48

REM Log result with timestamp
echo [%date% %time%] Scraper completed with exit code %ERRORLEVEL% >> logs\scheduler.log
