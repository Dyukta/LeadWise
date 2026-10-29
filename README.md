# Leadwise

A lead management CRM for sales and telecalling teams. Leads arrive from Facebook and Instagram ads and from Excel sheets, the owner hands them out, and each caller calls, follows up and closes their own.

> **This is a demo with fake data.** Leadwise is a public copy of an internal CRM I built for a real company. Every person, phone number, project, campaign and deal amount here is made up by the seed script. No company data is in this repo. The Meta lead sync is the real code, but it is not connected in the demo.

## The problem

A sales or telecalling team running ads gets dozens of leads a day. Leads that are not called quickly go cold. When two people end up calling the same customer, it looks bad. And at the end of the month the owner wants to know who closed what, and from which campaign.

Leadwise puts all of that in one place:

* New leads from the ads appear on their own, and the owner splits the day's leads evenly across the team in one click.
* Each salesperson sees only their own leads, plus the unassigned leads in the projects they work on.
* Every call, status change and handover is logged with who did it, when, and why.
* Follow ups are grouped into overdue, today and upcoming, so call backs don't get missed.
* Closed deals feed a leaderboard. When a lead was worked by more than one person, the deal value is split between them.

## What's in it

* **Leads.** Mine, Unassigned and All views. Filter by project, priority, repeat enquiries, month or date range. Edit, assign, reassign or bulk assign.
* **Status rules.** There are 13 statuses, from New to Closed. A lost lead needs a reason, a closed lead needs the deal amount, and closed or lost leads are locked.
* **Calls.** Calling a lead from the app logs the call. The owner also sees the whole team's calls.
* **Excel import.** Finds the name and phone columns by itself and rejects rows without a valid 10 digit number. A number that is already in the CRM is logged as a repeat enquiry instead of becoming a duplicate lead.
* **Owner tools.** Projects, users (invite, deactivate, hand someone's leads to another person), campaigns with lead counts and lead quality.
* **Sign in.** Email and password or Google. Only people the owner added on the Users page can get in.

## The hard part: getting leads out of Meta

Most of the app is ordinary CRUD done carefully. The Meta lead ads sync ([`backend/src/services/meta.ts`](backend/src/services/meta.ts)) is where things got tricky.

**Access comes before code.** A normal token can't read lead form data. It needs a Page access token with the `leads_retrieval` permission, which means going through Meta App Review and business verification before it works on a real page. Even after that, a token can stop working, so the sync has to be ready for that.

**Polling instead of webhooks.** Meta can send a webhook for each new lead, but the webhook only carries a lead ID, so you still have to call back for the details. Instead, the API polls every 15 minutes. It asks each lead form only for leads created after the last one it saw. This is simpler to run and picks up anything that came in while the server was down.

**Meta's data is messy.** Some examples:
* Dates come back as `2026-10-29T08:41:12+0000`. JavaScript doesn't reliably parse that offset, so it gets rewritten to `+00:00` first.
* Different forms name their fields differently, for example `full_name` or `name`, and `phone_number` or `phone`.
* The platform comes back as `ig` for Instagram.

**The same person shows up more than once.** People fill in a form twice, or answer ads for two projects. Each Meta lead ID is stored in a unique column, so a lead is never imported twice. Phone numbers are normalised, and a number that already exists is added to the original lead as a "repeat enquiry". Salespeople see that the customer came back instead of getting a second copy.

**Old campaigns keep sending leads.** A lead form doesn't care whether the campaign behind it is still running. With an ad account configured, the sync checks which campaigns are active, which uses a separate ads token, and skips the rest. A campaign flagged as stopped in the database is skipped too.

**Failures are visible.** If a sync fails, for example because a token expired or Meta returned an error, the message is saved and shown on the Campaigns page. The owner sees it without anyone reading server logs. A simple guard also makes sure two syncs never run at the same time.

## How it fits together

The React app signs in with Supabase Auth. Every read and write goes to one endpoint, `POST /api/rpc`, as `{ action, args, token }`. The Express API checks the token, loads the user, applies the visibility rules (owner or employee, own leads or team leads) and only then touches Postgres. The browser never writes to the database directly.

**Stack:** React 19, TypeScript, TanStack Query, Tailwind CSS, Vite, Express 5, Supabase (Postgres and Auth). The API runs TypeScript directly on Node 22.18+, so there is no build step on the server.

## What I'd do next

* **Call duration tracking.** Right now a call is logged when someone taps Call, but the app can't tell a 5 second miss from a 10 minute conversation. Recording how long each call lasted would make the call stats and team performance much more honest.
* **Bulk WhatsApp messages.** Callers often send the same details or follow up message to many leads by hand. Selecting leads and sending one WhatsApp message to all of them through the WhatsApp Business API would save that time and log each message on the lead.
* **Tests.** The lead rules (status changes, transfers, follow ups, priority) are plain functions in `frontend/src/logic/rules/`, so they are the obvious place to start. There are no automated tests yet.
* **Running more than one API server.** The guard that stops two Meta syncs at once only works inside a single server process. With more than one server, I'd use a Postgres advisory lock.
* **Webhooks for faster leads.** A 15 minute delay is fine for this team. For anything faster, I'd add Meta webhooks and keep the polling as a safety net.

## Run it locally

You need Node 22.18 or newer and a free Supabase project.

**1. Database.** In the Supabase SQL editor, run `backend/supabase/schema.sql`, then `backend/supabase/crm_schema.sql`. Then, in the Supabase dashboard:

* Authentication > Users: add an owner and an employee (tick Auto Confirm User) with one shared password.
* Authentication > Hooks: set Before User Created to `public.gate_signups`.
* Authentication > Providers: turn on Google if you want it.

**2. Environment.** Create `backend/.env` using the variables below. The frontend reads it too, and only the values it maps reach the browser.

**3. Install, seed and start.**

```bash
cd backend
npm install
npm run seed
npm run dev
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. If `DEMO_PASSWORD` is set, the login page has one click sign in for the owner and the employee.

The seed clears the CRM tables and generates about six months of history: projects, campaigns, leads with their calls, status changes, repeat enquiries and deal amounts, and a few fresh unassigned leads for today. It is deterministic, so every run gives the same data relative to today.

### Environment variables

* `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY` (required): the project URL, the service role key (stays on the server) and the publishable key (used by the browser for sign in only).
* `ALLOWED_ORIGINS` (required): comma separated web origins allowed to call the API. The first one is also where invite emails link to.
* `APP_NAME`, `APP_TIME_ZONE` (required): the product name and an IANA zone for business days, for example `Asia/Kolkata`.
* `PORT`: API port, 4000 by default.
* `DEMO_OWNER_EMAIL`, `DEMO_EMPLOYEE_EMAIL`, `DEMO_PASSWORD`: the demo accounts. Write a `$` in the password as `\$`. Leave `DEMO_PASSWORD` unset in production.
* `META_PAGE_TOKEN`: turns on the Meta sync. Leave it unset for the demo.
* `META_FORM_IDS`, `META_AD_ACCOUNT`, `META_ADS_TOKEN` (optional): limit the sync to certain forms, and skip leads from campaigns that are no longer running.
* `VITE_API_URL`: the full RPC URL when the web app is hosted apart from the API. Defaults to `/api/rpc`.

### Deploying

* **Database:** run both SQL files on the production Supabase project and set the Before User Created hook. Add the site's `/login` and `/set-password` URLs to Auth redirect URLs.
* **API:** any Node host. Run `npm install`, then `npm start`. `GET /api/health` works as a health check.
* **Web app:** run `npm run build` and publish `dist` on any static host. Send every path that is not a file to `index.html`.
