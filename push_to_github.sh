#!/bin/bash
# Add all files
git add .

# Create commit with fix message
git commit -m "Fix module paths: DataFusionEngine and Dockerfile configService"

# Push to master branch
git push origin master
