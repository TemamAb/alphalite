#!/bin/bash
# Push AlphaPro to GitHub master branch

cd ~/Desktop/Alphaline

# Add all files
echo "Adding files to git..."
git add .

# Commit changes with descriptive message
echo "Committing changes..."
git commit -m "Fix: PRIVATE_KEY loading from .env + improved config paths + Dockerfile updates"

# Set branch to master
echo "Setting branch to master..."
git branch -M master

# Add remote (if not already added)
git remote add origin https://github.com/TemamAb/alphalite.git 2>/dev/null

# Push to master
echo "Pushing to GitHub master..."
git push -u origin master

echo "Done!"
