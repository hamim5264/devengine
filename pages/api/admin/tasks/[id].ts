import type { NextApiRequest, NextApiResponse } from "next";
import { createTaskHandlers } from "../../../../lib/server/tasks/handlers";
const handlers=createTaskHandlers();
export default function detail(req:NextApiRequest,res:NextApiResponse){return handlers.detail(req,res);}
