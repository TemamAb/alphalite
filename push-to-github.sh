#!/bin/bash
# Push AlphaPro to GitHub

cd /c/Users/op/Desktop/AlphaPro

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
    git init
fi

# Add all files
git add .

# Commit changes
git commit -m "Fix TypeScript build for Render deployment"

# Set branch to master
git branch -M master

# Add remote (if not already added)
git remote add origin https://github.com/TemamAb/alphalie.git 2>/dev/null || true

# Push to master
git push -u origin master
