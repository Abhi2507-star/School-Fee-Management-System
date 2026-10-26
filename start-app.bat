@echo off
title Swami Vivekanand SFMS — Starting Application
echo ====================================================================
echo Starting Swami Vivekanand Sikshan Sansthan (SFMS)...
echo ====================================================================
cd /d "%~dp0"
node scripts\serve-app.js
pause
