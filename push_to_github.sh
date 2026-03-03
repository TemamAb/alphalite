#!/bin/bash
git config --global user.email "developer@alphapro.io"
git config --global user.name "AlphaPro Developer"
git add .
git commit -m "fix: Wallet import & key import buttons + MultiPathDetector for <200ms latency + improved balance fetching"
git push origin master
