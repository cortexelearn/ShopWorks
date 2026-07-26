# ShopWorks — Shop Floor Demo

Digital traveler MES demo for Island Components: live floor map with WIP/capacity,
sales orders with family trees + spaghetti charts, and a station tablet with
**real QR kitting cards and live camera scanning**.

## Deploy to GitHub Pages (camera works there — HTTPS)

1. Create a new GitHub repository (e.g. `island-mes`) and push this folder:
   ```bash
   git init
   git add -A
   git commit -m "IslandMES demo v0.2"
   git branch -M main
   git remote add origin https://github.com/<YOUR-USER>/island-mes.git
   git push -u origin main
   ```
2. In the repo: **Settings → Pages → Source: GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) builds and deploys
   automatically on every push to `main`. Your app will be live at:
   `https://<YOUR-USER>.github.io/island-mes/`

Because GitHub Pages is served over **HTTPS**, `getUserMedia` works: the
Station Tablet tab can open the camera and scan real kitting-card QR codes
on iPads and Android tablets. (The browser will show a one-time camera
permission prompt on first use.)

## Local development

```bash
npm install
npm run dev        # serves with --host so tablets on your LAN can reach it
```

Note: camera access requires a secure context. `http://localhost` works on the
dev machine itself; for tablets on the LAN over plain http you'll need either
the deployed Pages URL, an HTTPS tunnel (ngrok / cloudflared), or Chrome's
`chrome://flags/#unsafe-treated-as-secure-origins` set to your dev URL.

## The QR demo loop

1. Open any traveler → **⌸ Kitting Card (QR)** → the card shows a real QR
   encoding `SW:J-####` (job ID only — the tablet fetches live state on scan).
   Print it, or just display it on a second screen.
2. On the tablet: **Station Tablet → Start Camera Scan** → point at the card.
3. The traveler opens full-screen at its current step: instructions, figure,
   PPE, disposition (All Pass / All Fail / Split), NCR, Hold, QA-stamp gating.
4. Sign off → back to the scanner for the next unit. The floor map updates live.

## What's demo-only

In-memory state (refresh resets), fictitious NCR register, seeded operators,
placeholder work-instruction figures, and JobBOSS² data is seeded rather than
synced. The production path replaces the seed data with a backend fed by the
JobBOSS² REST API, per-user badge auth, and a PostgreSQL store — the data
shapes in `src/App.jsx` (parts → ops → zones, jobs → signoffs, sales orders)
map directly onto that schema.
