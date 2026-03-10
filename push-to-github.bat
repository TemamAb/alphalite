@echo off
REM Push AlphaPro to GitHub

cd /d c:\Users\op\Desktop\Alphaline

REM Initialize git if not already initialized
if not exist ".git" (
    echo Initializing git...
    git init
)

REM Add all files
echo Adding files to git...
git add .

REM Commit changes
echo Committing changes...
git commit -m "AlphaPro deployment ready - 100%% deployment readiness"

REM Set branch to main
git branch -M main

REM Add remote (if not already added)
git remote add origin https://github.com/TemamAb/alphalite.git 2>nul

REM Push to main
echo Pushing to GitHub...
git push -u origin main

echo Done!
pause
