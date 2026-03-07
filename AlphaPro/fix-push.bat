@echo off
REM Fix Git Remote and Push to alphalite

echo Step 1: Remove old remote origin...
git remote remove origin

echo Step 2: Add new remote origin for alphalite...
git remote add origin https://github.com/TemamAb/alphalite.git

echo Step 3: Pull and rebase with remote changes...
git pull origin main --rebase

echo Step 4: Push to GitHub...
git push -u origin main

echo.
echo Done! Code pushed to https://github.com/TemamAb/alphalite
pause
