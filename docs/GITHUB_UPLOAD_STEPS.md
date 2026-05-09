# GitHub Upload Steps

From the project folder:

```bash
git init
git add .
git commit -m "Initial Focus Gatekeeper extension"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/focus-gatekeeper.git
git push -u origin main
```

Before pushing publicly, review:

- `README.md`
- `PRIVACY.md`
- `store/CHROME_WEB_STORE_LISTING.md`
- `store/PERMISSIONS_JUSTIFICATION.md`
- `QA_CHECKLIST.md`

The ZIP package is intentionally ignored by `.gitignore`; build or attach it separately when needed.
