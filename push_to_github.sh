#!/bin/bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit of Alphalite app"

# Add remote origin
git remote add origin https://github.com/TemamAb/alphalite.git

# Push to main branch
git push origin main
