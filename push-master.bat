@echo off
REM Push AlphaPro to GitHub master branch

cd /d c:\Users\op\Desktop\Alphaline

REM Add all files
echo Adding files to git...
git add .

REM Commit changes with descriptive message
echo Committing changes...
git commit -m "Fix: PRIVATE_KEY loading from .env + improved config paths + Dockerfile updates"

REM Set branch to master
echo Setting branch to master...
git branch -M master

REM Add remote (if not already added)
git remote add origin https://github.com/TemamAb/alphalite.git 2>nul

REM Push to master
echo Pushing to GitHub master...
git push -u origin master

echo Done!
pause
