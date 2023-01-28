import type { NextApiRequest, NextApiResponse } from 'next'

export type StatusResponse = {
  status: string
}

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse>
) {
  res.status(200).json({ status: "Online" })
}
