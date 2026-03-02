@echo off
REM Add all files
git add .

REM Create commit with fix
git commit -m "Fix: Null check for Pimlico config"

REM Push to master branch
git push origin master
