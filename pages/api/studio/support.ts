import type {NextApiRequest,NextApiResponse} from 'next';
const {support}=require('@/lib/server/studio/handlers');
export default function route(req:NextApiRequest,res:NextApiResponse){return support(req,res);}
export const config={api:{bodyParser:{sizeLimit:'1kb'}}};
