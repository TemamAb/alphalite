#!/bin/bash
# Push AlphaPro to GitHub

cd /c/Users/op/Desktop/Alphaline

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
    echo "Initializing git..."
    git init
fi

# Add all files
echo "Adding files to git..."
git add .

# Commit changes
echo "Committing changes..."
git commit -m "AlphaPro deployment ready - 100% deployment readiness"

# Set branch to main
git branch -M main

# Add remote (if not already added)
git remote add origin https://github.com/TemamAb/alphalite.git 2>/dev/null || true

# Push to main
echo "Pushing to GitHub..."
git push -u origin main

echo "Done!"
