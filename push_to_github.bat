@echo off
cd /d "%~dp0AlphaPro"
git add -A
git commit -m "fix: Docker deployment and .env configuration"
git push origin master
