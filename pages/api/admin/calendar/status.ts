import type { NextApiRequest, NextApiResponse } from "next";
import { createCalendarHandlers } from "../../../../lib/server/calendar/handlers";

const handlers = createCalendarHandlers();
export default function status(req: NextApiRequest, res: NextApiResponse) {
  return handlers.status(req, res);
}
