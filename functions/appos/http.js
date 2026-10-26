const https=require('node:https');
const { lookup }=require('node:dns/promises');
const { isIP }=require('node:net');
const { fail }=require('./model');
function publicAddress(ip) {
  // Only globally routable IPv4 destinations; reject all IPv6/mapped addresses conservatively.
  if(isIP(ip)!==4)return false;
  const [a,b]=ip.split('.').map(Number);
  return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===2)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51)||a===203&&b===0);
}
async function api(base,path,token,method='GET',body,customHeaders={},withHeaders=false,maxSize=35*1024*1024) {
  const target=new URL(`${base.replace(/\/$/,'')}${path}`);
  if(target.protocol!=='https:'||target.username||target.password||target.port&&target.port!=='443')fail('Use a public HTTPS API on port 443.');
  const records=await lookup(target.hostname,{all:true,family:4});
  if(!records.length||records.some(r=>!publicAddress(r.address)))fail('Private, local and reserved API destinations are blocked.');
  const address=records[0].address;
  return new Promise((resolve,reject)=>{
    const headers={Accept:'application/json',...(token?{Authorization:`Bearer ${token}`}:{}),...customHeaders};
    if(body&&!headers['Content-Type'])headers['Content-Type']='application/json';
    const req=https.request(target,{method,family:4,autoSelectFamily:false,lookup:(_host,_options,done)=>done(null,address,4),headers},res=>{
      let result='',size=0;res.on('data',chunk=>{size+=chunk.length;if(size>maxSize){res.destroy();reject(new Error('API response is too large.'));}else result+=chunk;});
      res.on('error',reject);res.on('end',()=>{if(res.statusCode<200||res.statusCode>=300){reject(new Error(`The API rejected the operation with HTTP ${res.statusCode}.`));return;}
        let parsed={};if(result){try{parsed=JSON.parse(result);}catch{parsed={raw:result};}}
        if(withHeaders)resolve({data:parsed,headers:res.headers,statusCode:res.statusCode});
        else resolve(parsed);
      });
    });
    req.setTimeout(25000,()=>req.destroy(new Error('API connection timed out.')));req.on('error',reject);if(body)req.write(typeof body==='string'?body:JSON.stringify(body));req.end();
  });
}
module.exports={api,publicAddress};

