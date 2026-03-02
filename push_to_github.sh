#!/bin/bash
# Add all files
git add .

# Create commit with fix
git commit -m "Fix: Null check for Pimlico config"

# Push to master branch
git push origin master
