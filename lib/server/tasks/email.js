const { CalendarError } = require('../calendar/config');
const { productionOrigin } = require('../../../config/deployment.json');
const { DELETION_EMAILJS_DEFAULTS } = require('../../../config/emailjs');
const { eventLabel } = require('./model');
const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function providerConfiguration(env = process.env) {
  const clean=value=>String(value || '').trim();
  return {serviceId:clean(env.NEXT_PUBLIC_EMAILJS_DELETION_SERVICE_ID) || DELETION_EMAILJS_DEFAULTS.serviceId,
    publicKey:clean(env.NEXT_PUBLIC_EMAILJS_DELETION_PUBLIC_KEY) || DELETION_EMAILJS_DEFAULTS.publicKey,
    templateId:clean(env.EMAILJS_TASK_TEMPLATE_ID),privateKey:clean(env.EMAILJS_PRIVATE_KEY)};
}
function emailConfiguration(env = process.env) {
  const provider=providerConfiguration(env),missing=['EMAILJS_TASK_TEMPLATE_ID','EMAILJS_PRIVATE_KEY'].filter(key=>!env[key]);
  return {configured:!!provider.templateId && !!provider.privateKey,missing,provider:'EmailJS',sharedService:'deletion',templateConfigured:!!provider.templateId,privateKeyConfigured:!!provider.privateKey};
}
function template(task,event,href,context={}) {
  let due='No deadline';
  if(task.dueAt){try{due=new Intl.DateTimeFormat('en',{timeZone:task.timezone || 'Asia/Dhaka',dateStyle:'medium',timeStyle:'short'}).format(new Date(task.dueAt))+` (${task.timezone || 'Asia/Dhaka'})`;}catch{/* Safe optional-date fallback. */}}
  const heading=event==='test_email'?'Your DevEngine test email':eventLabel(event);
  const title=String(task.title || 'DevEngine task').replace(/[\r\n]+/g,' ').slice(0,180);
  return {
    to_name:escape(context.user?.displayName || 'Team member'),to_email:context.user?.email || '',
    email_subject:`DevEngine · ${heading}: ${title}`,email_heading:escape(heading),
    notification_message:escape(event==='test_email'?'This test confirms that DevEngine can submit task notifications through your shared EmailJS Gmail service.':`${heading}. Open DevEngine to review the task and its latest details.`),
    task_title:escape(title),task_description:escape(task.description || 'No description provided.'),
    task_status:escape(String(task.status || 'todo').replace(/_/g,' ')),task_priority:escape(task.priority || 'medium'),
    task_due_date:escape(due),assigned_by:escape(task.assignedByName || 'DevEngine administration'),
    task_url:href,dashboard_url:productionOrigin+(context.admin?'/admin/dashboard':'/staff/dashboard'),
  };
}
async function sendTaskEmail(user,task,event,admin,fetcher=fetch,env=process.env) {
  if(!emailConfiguration(env).configured)throw new CalendarError('email_not_configured',503);
  if(!user || user.disabled || !/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(user.email || ''))throw new CalendarError('email_recipient_unavailable',400);
  const provider=providerConfiguration(env);
  const href=productionOrigin+(admin?`/admin/task-manager?task=${encodeURIComponent(task.id || '')}`:'/staff/notifications');
  const params=template(task,event,href,{user,admin});
  let response;
  try{response=await fetcher('https://api.emailjs.com/api/v1.0/email/send',{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify({service_id:provider.serviceId,template_id:provider.templateId,user_id:provider.publicKey,accessToken:provider.privateKey,template_params:params})});}
  catch{throw new CalendarError('email_delivery_unknown',502);}
  if(!response.ok){
    // Never expose or log the provider body: it may contain account identifiers.
    let reason='';try{reason=String(await response.text()).slice(0,4096).toLowerCase();}catch{/* Keep the safe fallback. */}
    let code='email_rejected';
    if(response.status===429)code='email_rate_limited';
    else if(response.status>=500)code='email_delivery_unknown';
    else if(/non[ -]?browser|server[ -]?side|api calls.*disabled|api.*disabled/.test(reason))code='email_server_requests_disabled';
    else if(/private.?key|access.?token/.test(reason))code='email_private_key_invalid';
    else if(/public.?key|user_id|user id/.test(reason))code='email_public_key_invalid';
    else if(/template/.test(reason))code='email_template_invalid';
    else if(/recipient|destination|to address/.test(reason))code='email_template_recipient_invalid';
    else if(/insufficient.*scope|invalid_grant|authentication|reconnect|gmail/.test(reason))code='email_gmail_reconnect_required';
    else if(/service/.test(reason))code='email_service_invalid';
    else if(/quota|limit|upgrade|subscription/.test(reason))code='email_quota_exceeded';
    throw new CalendarError(code,502);
  }
  return {status:'provider_accepted'};
}
const EMAIL_REJECTION_CODES=Object.freeze(['email_rejected','email_server_requests_disabled','email_private_key_invalid','email_public_key_invalid','email_template_invalid','email_template_recipient_invalid','email_gmail_reconnect_required','email_service_invalid','email_quota_exceeded']);
module.exports={emailConfiguration,providerConfiguration,template,sendTaskEmail,EMAIL_REJECTION_CODES};
