# Vikas Message Automator

**Local WhatsApp automation for Vikas Automobiles**  
HP Lube Distributor & C&F Agent — Satna, Madhya Pradesh 485001, India  
Phone: +91 9827003016

Version 1.2.2 — Zero software cost. Runs entirely on your Windows PC.

---

## 1. What this application does

- Connect WhatsApp Business via QR (unofficial multi-device protocol)
- Manage dealer / workshop contacts with explicit consent tracking
- Create and schedule promotional or transactional campaigns
- Smart pacing engine with daily limits and working-hours awareness
- Opt-out (STOP) handling and suppression list
- Message history, templates, follow-up sequences, basic analytics
- Local backup & restore of your data

All data stays on your computer. No paid cloud services, no Meta Business API fees, no card required.

---

## 2. Important legal & technical disclosures

### Unofficial WhatsApp connectivity
This application uses the open-source **Baileys** library to speak the WhatsApp Web multi-device protocol.  
**Meta / WhatsApp does not officially support or endorse this method.**

- Account bans or temporary restrictions are possible if you send spam or violate WhatsApp’s terms.
- Always obtain **explicit opt-in consent** before promotional messages.
- Use the built-in Smart Pacing Engine (recommended 12–20 seconds between messages).
- Contacts who reply STOP are immediately suppressed.

### Zero-cost requirement
- No paid APIs
- No paid WhatsApp Business API subscription
- No paid hosting or database
- SQLite + JSON local storage only

---

## 3. Windows 10 / 11 installation

### Prerequisites
- Node.js **22.13 or higher** (required for node:sqlite) from https://nodejs.org/

### Steps
1. Extract the ZIP to a folder of your choice (example: `C:\VikasAutomator`).
2. Double-click **`install.bat`**.  
   It installs all open-source packages and creates the local `data` folders.
3. Double-click **`start.bat`**.  
   The browser should open at `http://127.0.0.1:3000`.
4. On first launch complete the **Owner setup wizard**. The server console prints a one-time **SETUP TOKEN** — enter it with your email and a strong password (min 10 characters). Login uses **email only**.
5. Go to **WhatsApp Connection** → Connect → scan the QR with WhatsApp Business on your phone.

### Stopping the server
- Close the terminal window, or run **`stop.bat`**.

### Backup
- Run **`backup.bat`** any time. Snapshots are written to the `backups\` folder.

---

## 4. Security features (v1.2.1)

| Feature | Implementation |
|---------|----------------|
| Bind address | Defaults to `127.0.0.1` (localhost only) |
| Session secret | Auto-generated on first run, stored in `data/session.secret` |
| Session storage | Persistent file-based store (`data/sessions/`) |
| Session fixation | Session ID regenerated on every successful login |
| Request body limit | 2 MB |
| Trust proxy | Disabled unless `TRUST_PROXY=1` is set |
| CSRF | Token required on all mutating API calls |
| Rate limiting | API + dedicated login limiter |
| Auth & RBAC | Session-based with ADMIN / MANAGER / EMPLOYEE roles |
| Default passwords | None — first-run Owner setup required |
| DEMO / LIVE | DEMO is default and never calls the real WhatsApp socket |
| Role switching | Disabled — log in as the intended account |
| LIVE activation | ADMIN only, confirmLive required, WhatsApp must be connected |
| Consent | Public form creates PENDING only; admin must verify OPTED_IN |
| Database writes | Atomic (temp file + rename) |

---

## 5. Environment variables (optional)

Copy `.env.example` to `.env` and adjust:

```
PORT=3000
BIND_HOST=127.0.0.1
# SESSION_SECRET=   (leave blank to auto-generate)
# TRUST_PROXY=0
```

---

## 6. Running tests (developers)

```bat
npm run test
```

Tests cover consent defaults, opt-out detection, queue claim logic and basic pacing rules.  
Live WhatsApp pairing and real message delivery require a physical phone and are marked **NOT LIVE-VERIFIED** in the test report until you perform them.

---

## 7. Data locations

| Path | Purpose |
|------|---------|
| `data/database.json` | Contacts, campaigns, messages, templates, etc. |
| `data/counters.sqlite` | Daily send counters + consent event history |
| `data/baileys_auth_info/` | WhatsApp multi-device credentials (protect this folder) |
| `data/sessions/` | Server login sessions |
| `data/session.secret` | Session signing key (do not share) |
| `backups/` | Timestamped snapshots created by backup.bat |

---

## 8. Support & responsibility

This software is provided for the internal use of Vikas Automobiles.  
The authors and maintainers accept no liability for WhatsApp account restrictions, data loss, or regulatory penalties arising from misuse (especially unsolicited promotional messaging).

Always follow applicable Indian IT and telecom rules and Meta’s terms of service.

---

**Vikas Automobiles — HP Lubricants Distributor & C&F Agent, Satna (M.P.)**
