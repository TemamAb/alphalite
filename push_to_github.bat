@echo off
git add .
git commit -m "feat(wallets): Implement private key upload and auto-population"
git commit -m "fix(wallets): Correctly parse wallet import files with robust line ending handling"
git push origin master
