import type {NextApiRequest,NextApiResponse} from "next";
import {createTaskHandlers} from "../../../../lib/server/tasks/handlers";
const handlers=createTaskHandlers();
export const config={api:{bodyParser:{sizeLimit:"2kb"}}};
export default function email(req:NextApiRequest,res:NextApiResponse){return handlers.email(req,res);}
