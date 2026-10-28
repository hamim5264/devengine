import type {GetServerSideProps} from 'next';
import {publicContent} from '@/lib/server/public/content';
import deployment from '@/config/deployment.json';
const xml=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const timestamp=(value:unknown)=>{const date=typeof value==='string'?new Date(value):null;return date&&Number.isFinite(date.getTime())?date.toISOString():'';};
export const getServerSideProps:GetServerSideProps=async({res})=>{
 try{
  const [blogs,projects,apps]=await Promise.all([publicContent('blogs','isPublished',true),publicContent('projects'),publicContent('app_policies')]);
  const urls=new Map<string,{date:string;priority:string}>();
  for(const path of ['/home','/about','/projects','/services','/blog','/pricing','/contact','/career','/reviews','/documentation-and-api-access','/terms','/privacy-policy','/refund-policy','/commercial-license','/security-protocol','/archive','/launchpad','/app-lab','/lab','/copyright'])urls.set(path,{date:'',priority:path==='/home'?'1.0':'0.7'});
  const add=(path:string,item:Record<string,any>)=>urls.set(path,{date:timestamp(item.updatedAt||item.publishedAt||item.createdAt),priority:'0.8'});
  for(const b of blogs)if(b.isPublished===true&&typeof b.slug==='string'&&b.slug.trim())add(`/blog/${encodeURIComponent(b.slug.trim())}`,b);
  for(const p of projects)if(p.isPublic!==false)add(`/projects/${encodeURIComponent(p.slug||p.id)}`,p);
  for(const a of apps)if(a.isPublished!==false&&typeof a.slug==='string'&&a.slug.trim())for(const suffix of ['','/privacy-policy','/terms','/data-deletion'])add(`/apps/${encodeURIComponent(a.slug.trim())}${suffix}`,a);
  const body=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].map(([path,{date,priority}])=>`<url><loc>${xml(deployment.productionOrigin+path)}</loc>${date?`<lastmod>${date}</lastmod>`:''}<priority>${priority}</priority></url>`).join('\n')}\n</urlset>`;
  res.setHeader('Content-Type','application/xml; charset=utf-8');res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=3600');res.end(body);
 }catch{
  // Ask crawlers to retry instead of advertising demo URLs or an empty catalog.
  res.statusCode=503;res.setHeader('Retry-After','60');res.setHeader('Cache-Control','no-store');res.end('Sitemap temporarily unavailable.');
 }
 return {props:{}};
};
export default function Sitemap(){return null;}
