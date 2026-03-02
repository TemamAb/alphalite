#!/bin/bash
git config --global user.email "developer@alphapro.io"
git config --global user.name "AlphaPro Developer"
git add .
git commit -m "fix: Resolve DataFusionEngine startup errors - setTimeout and null wsUrl handling"
git push origin master
