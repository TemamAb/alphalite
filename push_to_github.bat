@echo off
REM Initialize git repository
git init

REM Add all files
git add .

REM Create initial commit
git commit -m "Initial commit of Alphalite app"

REM Add remote origin
git remote add origin https://github.com/TemamAb/alphalite.git

REM Push to main branch
git push origin main

pause
