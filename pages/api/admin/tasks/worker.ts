import type { NextApiRequest, NextApiResponse } from "next";
import { createTaskHandlers } from "../../../../lib/server/tasks/handlers";
const handlers=createTaskHandlers();
export const config={maxDuration:60};
export default function worker(req:NextApiRequest,res:NextApiResponse){return handlers.worker(req,res);}
