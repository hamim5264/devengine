import type { NextApiRequest, NextApiResponse } from "next";
import { createCalendarHandlers } from "../../../../lib/server/calendar/handlers";
const handlers = createCalendarHandlers();
export const config = { api: { bodyParser: { sizeLimit: "1kb" } } };
export default function disconnect(req: NextApiRequest, res: NextApiResponse) { return handlers.disconnect(req,res); }
