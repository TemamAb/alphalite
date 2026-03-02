@echo off
REM Add all files
git add .

REM Create commit with all upgrades
git commit -m "AlphaPro upgrade: Add Sentinel, MEV Engineer, Oracle optimization, and Database"

REM Push to master branch
git push origin master
