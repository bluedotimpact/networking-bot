import Head from 'next/head'
import { useEffect, useState } from 'react'
import axios, { isAxiosError } from 'axios'
import { StatusResponse } from './api/status'

export default function Home() {
  const [status, setStatus] = useState('Loading...')
  useEffect(() => {
    axios<StatusResponse>({
      method: 'get',
      url: '/api/status'
    }).then(res => {
      setStatus(res.data.status)
    }).catch(err => {
      setStatus('Error: ' + (isAxiosError(err) ? err.message : String(err)))
    })
  }, [])

  const [isLocal, setIsLocal] = useState(false)
  useEffect(() => {
    setIsLocal(
      typeof window !== "undefined"
      && (
        window.location.hostname === "localhost"
        || window.location.hostname.endsWith(".ngrok.io")
      )
    );
  }, [])

  return (
    <>
      <Head>
        <title>networking-bot</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <h1>networking-bot</h1>
      <p>Status: {status}</p>
      <h2>Common actions:</h2>
      <ul>
        <li><a href="https://www.notion.so/bluedot-impact/Networking-bot-89bec8d266884408839970b6d9512c62">Read documentation</a></li>
        <li><a href="https://github.com/bluedotimpact/networking-bot">View code</a></li>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <li><a href="/api/slack/install">Add to Slack</a></li>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <li><a href={isLocal ? "/api/scheduler/run" : "https://github.com/bluedotimpact/networking-bot/actions/workflows/cron.yaml"}>Run scheduler</a></li>
      </ul>
    </>
  )
}
