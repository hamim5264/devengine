import type { NextApiRequest, NextApiResponse } from "next";
import { createCalendarHandlers } from "../../../../lib/server/calendar/handlers";

const handlers = createCalendarHandlers();
export default function callback(req: NextApiRequest, res: NextApiResponse) {
  return handlers.callback(req, res);
}
