import type { NextApiRequest, NextApiResponse } from "next";
import { createCalendarHandlers } from "../../../../lib/server/calendar/handlers";

export const config = { api: { bodyParser: { sizeLimit: "1kb" } } };
const handlers = createCalendarHandlers();
export default function authorize(req: NextApiRequest, res: NextApiResponse) {
  return handlers.authorize(req, res);
}
