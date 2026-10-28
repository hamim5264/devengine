import type {NextApiRequest,NextApiResponse} from 'next';
const {serviceUsage}=require('@/lib/server/usage/handlers');
export const maxDuration=60;
export default function handler(req:NextApiRequest,res:NextApiResponse){return serviceUsage(req,res);}
