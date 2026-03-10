@echo off
REM Commit login fix and push to GitHub

cd /d c:\Users\op\Desktop\Alphaline

REM Add all files
echo Adding files to git...
git add .

REM Commit changes with login fix description
echo Committing changes...
git commit -m "FIX: Login page authentication - Added CORS, fixed JWT secret, corrected password hash

- Added CORS middleware to allow cross-origin requests from dashboard
- Fixed JWT_SECRET to be stable across server restarts  
- Corrected SHA256 password hash for 'Temam@1954'
- Updated .env.production for proper API URL handling"

REM Push to master
echo Pushing to GitHub...
git push -u origin master

echo Done!
pause
