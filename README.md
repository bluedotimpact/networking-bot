# networking-bot

A Slack app that pairs up paticipants for 1:1 conversations.

## Progress notes

Complete:
- Set up project with API
- Build db helper to safely use AirTable as a database
- Set up Slack OAuth
- Set up matcher basics

Next: fix how this will pull in participants in a multi-tenant way. Got some way to doing this, but need to edit the db logic to do use the defined table mappings, and then actually make the mappings use the installation table. Also need some way to set up the installation table - maybe okay to be manual for now.

https://www.notion.so/bluedot-impact/Networking-bot-89bec8d266884408839970b6d9512c62

## Developer setup

1. Clone this repository
2. Install Node
3. Install dependencies with `npm install`
4. Get access to the [[Example] Slack networking bot](https://airtable.com/appnNmNoNMB6crg6I/tblS8xNuLljBS5Lml/viwx3r0P8Be3s78rh?blocks=hide) base and create an [AirTable personal access token](https://support.airtable.com/docs/creating-and-using-api-keys-and-access-tokens)
5. Set the environment variables in [`.env.local`](./.env.local)
6. Run the server with `npm start`

## Deployment

This app is deployed using Vercel and uses an Airtable base itself as the database. API keys are stored safely in Vercel environment variables.
