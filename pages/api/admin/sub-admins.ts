import type {NextApiRequest,NextApiResponse} from 'next';
const {subAdmins}=require('@/lib/server/studio/handlers');
export default function route(req:NextApiRequest,res:NextApiResponse){return subAdmins(req,res);}
export const config={api:{bodyParser:{sizeLimit:'4kb'}}};
