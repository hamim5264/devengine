// Production-build check in a temporary source copy. Never load the workspace's .env files.
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');
async function run(){
  const root=path.resolve(__dirname,'..'),dir=await fs.mkdtemp(path.join(os.tmpdir(),'devengine-task-build-'));
  try{
    const names=['pages','components','lib','styles','context','types','utils','hooks','config','data','functions','package.json','next.config.js','tsconfig.json','postcss.config.js','postcss.config.mjs','tailwind.config.js','tailwind.config.ts','next-env.d.ts','eslint.config.mjs'];
    for(const name of names){try{await fs.access(path.join(root,name));}catch{continue;}await fs.cp(path.join(root,name),path.join(dir,name),{recursive:true,filter:source=>!source.split(path.sep).some(part=>part==='node_modules'||part==='.next'||part.startsWith('.env'))});}
    for(const name of ['node_modules','public','assets']){try{await fs.symlink(path.join(root,name),path.join(dir,name),'dir');}catch{/* Optional assets directory. */}}
    const env={PATH:process.env.PATH,HOME:dir,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_FIREBASE_PROJECT_ID:'demo-task-build',NEXT_PUBLIC_FIREBASE_API_KEY:'fake-api-key-for-isolated-build',NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:'demo-task-build.firebaseapp.com',NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:'demo-task-build.appspot.com',NEXT_PUBLIC_FIREBASE_APP_ID:'1:123456789:web:offlinebuild',NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:'123456789',FIREBASE_ADMIN_AUTH_MODE:'service_account',FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON:'{}'};
    const child=spawn('npm',['run','build'],{cwd:dir,env,stdio:['ignore','pipe','pipe']});
    child.stdout.on('data',data=>process.stdout.write(data));child.stderr.on('data',data=>process.stderr.write(data));
    const timeout=setTimeout(()=>child.kill('SIGTERM'),240000);
    const code=await new Promise(resolve=>child.on('exit',resolve));clearTimeout(timeout);process.exitCode=code===0?0:1;
  }finally{await fs.rm(dir,{recursive:true,force:true});}
}
run().catch(()=>{console.error('Isolated build infrastructure failed.');process.exitCode=1;});
