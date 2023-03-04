import createHttpError from "http-errors";
import { NextApiHandler } from "next"
import { slackAlert } from "./slackAlert";

export const apiRoute = (handler: NextApiHandler): NextApiHandler => async (req, res) => {
  try {
    await handler(req, res)
  } catch (err: unknown) {
    if (createHttpError.isHttpError(err) && err.expose) {
      console.warn('Error handling request:');
      console.warn(err);
      return res.status(err.statusCode).json({ error: err.message });
    } else {
      console.error('Internal error handling request:');
      console.error(err);
      await slackAlert(`Error: Failed request: ${err instanceof Error ? err.message : String(err)}`)
      return res.status(createHttpError.isHttpError(err) ? err.statusCode : 500).json({
        error: "Internal Server Error"
      });
    }
  }
}