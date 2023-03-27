# networking-bot

A Slack app that pairs up participants for 1:1 conversations.

![Architecture diagram](./architecture.svg)

## How it works

Each week, a cron job set up in GitHub Actions hits an endpoint:

```
POST /api/scheduler/run
```

This runs the Vercel Serverless Function defined by [run.ts](./src/pages/api/scheduler/run.ts).

It accesses a database, which stores:
- installations (which contain Slack installation details, and references to AirTable bases with participants)
- meetings
- meeting feedbacks

For each installation, it gets participants and matches them up. It then finds them on Slack, creates a group DM and sends a message to that DM. It then records this as a new meeting.

When users click buttons in the message, events are triggered. These are handled in [events.ts](./src/pages/api/slack/events.ts). Generally, these acknowledge the action, update the state of something in the database and send a follow-up message back to the channel.

## Progress notes

Complete:
- Set up project with API
- Build db helper to safely use Airtable as a database
- Set up Slack OAuth
- Set up matcher basics
- Set up multi-tenant participant fetching
- State management, i.e. confirmed/completed
- Handle receiving meeting feedback
- Restrict participants to an Airtable view
- Send follow-ups if no response
- Deploy to Vercel
- Handle multiple installations on the same Slack workspace
- Trigger run for a single installation

Todo:
- nice to have: smarter matcher logic
- nice to have: time availabilities

https://www.notion.so/bluedot-impact/Networking-bot-89bec8d266884408839970b6d9512c62

## Developer setup

1. Clone this repository
2. Install Node
3. Install dependencies with `npm install`
4. Get access to the [[Example] Slack networking bot](https://airtable.com/appnNmNoNMB6crg6I/tblS8xNuLljBS5Lml/viwx3r0P8Be3s78rh?blocks=hide) base and create an [Airtable personal access token](https://support.airtable.com/docs/creating-and-using-api-keys-and-access-tokens) with the scopes 'data.records:read', 'data.records:write', 'schema.bases:read', 'block:manage'.
5. Set the environment variables in [`.env.local`](./.env.local)
6. Run the server with `npm start`

### Local usage

So that OAuth and event callbacks to hit the right place, use localhost.run:

1. Run `ssh -R 80:localhost:8080 nokey@localhost.run`
2. In the Slack console for '(local) networking bot':
  - in [OAuth settings](https://api.slack.com/apps/A04PEDW8K3R/oauth), update the redirect URL to your lhr.life endpoint
  - in [Interactivity & Shortcuts](https://api.slack.com/apps/A04PEDW8K3R/interactive-messages) update the request URL to your lhr.life endpoint
3. In [.env.local](./.env.local) update the SLACK_REDIRECT_URI

You should then be able to use the app at your lhr.life url.

Data is stored in the Airtable base here: https://airtable.com/appnNmNoNMB6crg6I/tblzo9A4hjnxs8ezd/viwr3hvlKM7ebsf9v

## Deployment

This app is deployed using Vercel and uses an Airtable base as a database. API keys are stored safely in Vercel environment variables. GitHub Actions hits the scheduler endpoint.

To deploy a new version, simply commit to the master branch. GitHub Actions automatically handles CD, via `npm run deploy:prod`.
