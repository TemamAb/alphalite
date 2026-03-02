@echo off
cd /d "%~dp0"
git add -A
git commit -m "fix: Docker deployment and .env configuration"
git push origin master
