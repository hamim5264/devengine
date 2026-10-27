const {onSchedule}=require('firebase-functions/v2/scheduler');
const {defineSecret}=require('firebase-functions/params');
const secret=defineSecret('ADMIN_TASK_WORKER_SECRET');
// Activation requires an explicit future deployment. No keys or cloud changes at build time.
exports.adminTaskScheduler=onSchedule({schedule:'every 1 minutes',region:'us-central1',timeZone:'Etc/UTC',secrets:[secret],timeoutSeconds:60,maxInstances:1,retryCount:1},async()=>{
  const value=secret.value();if(value.length<32)throw new Error('Task worker secret is not configured.');
  const response=await fetch('https://www.devenginehq.com/api/admin/tasks/worker',{headers:{Authorization:`Bearer ${value}`},signal:AbortSignal.timeout(50000)});
  if(!response.ok)throw new Error(`Task worker returned status ${response.status}.`);
});
