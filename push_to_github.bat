@echo off
REM Add all files
git add .

REM Create commit with fix message
git commit -m "Fix module paths: DataFusionEngine and Dockerfile configService"

REM Push to master branch
git push origin master
