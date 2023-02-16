import { apiRoute } from '../../lib/apiRoute'
import type { NextApiRequest, NextApiResponse } from 'next'

export type StatusResponse = {
  status: string
}

export default apiRoute(async (
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse>
) => {
  res.status(200).json({ status: "Online" })
})
