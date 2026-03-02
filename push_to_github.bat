@echo off
REM Add all files
git add .

REM Create commit with fix
git commit -m "Fix: Add userop dependency"

REM Push to master branch
git push origin master
