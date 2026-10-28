import type {NextApiRequest,NextApiResponse} from 'next';
const {handler}=require('@/lib/server/progress/handlers');
export default function route(req:NextApiRequest,res:NextApiResponse){return handler(req,res);}
export const config={api:{bodyParser:{sizeLimit:'64kb'}}};
