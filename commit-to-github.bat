@echo off
cd /d "%~dp0"
git add -A
git commit -m "Remove JWT authentication - deployment ready"
git push origin master
