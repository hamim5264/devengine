import type { NextApiRequest, NextApiResponse } from "next";
import { createTaskHandlers } from "../../../../lib/server/tasks/handlers";
const handlers=createTaskHandlers();
export const config={api:{bodyParser:{sizeLimit:"32kb"}}};
export default function tasks(req:NextApiRequest,res:NextApiResponse){return handlers.index(req,res);}
