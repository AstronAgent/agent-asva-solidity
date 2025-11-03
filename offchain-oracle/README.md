# Raven Off-chain Oracle (Sepolia)

A minimal Express API that talks to the on-chain `RavenAccessWithSubgraphHooks` contract to:
- estimate inference cost
- authorize usage (subscription vs credits)
- read user state (credits/subscription)
- prepare calldata for writes (oracle/owner signs client-side)

## Endpoints
- GET `/health`
- POST `/inference/estimate` { mode, quantity? }
- POST `/inference/authorize` { user, mode, quantity? }
- GET `/users/:address/credits`
- GET `/users/:address/subscription`
- GET `/users/:address/has-active-subscription`
- POST `/memory/update` { user, memoryHash } → returns { to, data }
- POST `/credits/initial-grant` { user } → returns { to, data }

## Configuration
Set env vars (Vercel → Project → Settings → Environment Variables):
- `RPC_URL` = Sepolia RPC
- `RAVEN_ACCESS_ADDRESS` = deployed Access contract address

Local `.env` example:
```
RPC_URL=https://sepolia.infura.io/v3/XXXX
RAVEN_ACCESS_ADDRESS=0xYourAccessAddress
PORT=8080
```

## Local run
```bash
npm install
npm start
# open http://localhost:8080/health
```

## Deploy to Vercel (UI)
- Import this repo in Vercel
- Ensure `vercel.json` is at repo root (see below)
- Add `RPC_URL` and `RAVEN_ACCESS_ADDRESS` env vars
- Deploy → test `/health`

## vercel.json
This repo includes a minimal `vercel.json`:
```json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "server.js" }]
}
```

## Repo structure
```
server.js         # Express app (exports app for serverless)
ravenOracle.js    # On-chain read helpers & business logic
package.json      # deps & start script
vercel.json       # vercel routing/build config
```

## Push only this folder to a new GitHub repo
Option A (git subtree): from monorepo root
```bash
git subtree split --prefix=offchain-oracle -b offchain-oracle-deploy
# replace with your repo URL
git push https://github.com/pavankv241/agent-asva-temp offchain-oracle-deploy:main
```

Option B (copy into a fresh folder):
```bash
mkdir raven-oracle-offchain && cp -R offchain-oracle/* raven-oracle-offchain/
cd raven-oracle-offchain
git init
git add .
git commit -m "chore: init offchain oracle"
git branch -M main
# replace with your repo URL
git remote add origin https://github.com/pavankv241/agent-asva-temp
git push -u origin main
```

---
Security note: This API is read-only by default. Any on-chain writes are returned as calldata for the client (oracle/owner) to sign and send.

