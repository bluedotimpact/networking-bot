import Head from 'next/head'
import { Inter } from '@next/font/google'
import { useEffect, useState } from 'react'
import axios, { isAxiosError } from 'axios'
import { StatusResponse } from './api/status'

const inter = Inter({ subsets: ['latin'] })

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

  return (
    <>
      <Head>
        <title>networking-bot</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <h1>networking-bot</h1>
      <p>Status: {status}</p>
    </>
  )
}
