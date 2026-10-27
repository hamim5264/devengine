import {auth} from "@/lib/firebase";
export function taskError(value:unknown):string {
  const code=value instanceof Error?value.message:"task_service_unavailable";
  const messages:Record<string,string>={server_identity_not_configured:"Firebase server sign-in is required. Complete the Google Cloud sign-in in Firefox, then click Retry. Your Google Calendar keys are already configured.",task_service_unavailable:"Firebase server access is unavailable. Complete local Google Cloud sign-in or check the server identity configuration.",task_changed_refresh:"This task changed. Refresh it before saving again.",ambiguous_daylight_saving_time:"This time occurs twice due to daylight saving. Choose an unambiguous time.",nonexistent_local_time:"This local time does not exist due to daylight saving. Choose another time.",reopen_completed_task_as_todo:"Reopen the completed task as To Do before changing its status.",email_delivery_review_required:"Review delivery before retrying; an email may already have been sent."};
  const emailMessages:Record<string,string>={email_not_configured:"Set EMAILJS_TASK_TEMPLATE_ID and EMAILJS_PRIVATE_KEY on the server, then restart the development server.",email_rate_limited:"EmailJS rate limit reached. Wait before retrying.",test_email_rate_limited:"Send tests at least 1 minute apart, with a maximum of 3 per day.",email_delivery_unknown:"Delivery could not be confirmed. Check your inbox or EmailJS history before retrying to avoid duplicate messages.",email_rejected:"EmailJS rejected the request. Check the task template, private key and server-request permissions.",test_email_already_attempted:"This test was already attempted. Review the result before starting another."};
  const providerMessages:Record<string,string>={
    email_server_requests_disabled:"In EmailJS → Account → Security, enable API requests from non-browser applications, then retry. Keep the private key server-side.",
    email_private_key_invalid:"The EmailJS private key was rejected. Copy the private key from the same EmailJS account as the deletion service into EMAILJS_PRIVATE_KEY, then restart the dev server.",
    email_public_key_invalid:"The deletion-service public key was rejected. Use its account’s public key in NEXT_PUBLIC_EMAILJS_DELETION_PUBLIC_KEY, then restart the dev server.",
    email_template_invalid:"The task template was rejected. Save it in the same EmailJS account as the deletion service and set EMAILJS_TASK_TEMPLATE_ID, then restart the dev server.",
    email_template_recipient_invalid:"In the EmailJS task template, set To Email to {{to_email}} and save. The backend already supplies your authorized email address.",
    email_gmail_reconnect_required:"Reconnect the existing Gmail service in EmailJS and grant its required email permissions, then retry.",
    email_service_invalid:"EmailJS rejected the existing deletion service. Check NEXT_PUBLIC_EMAILJS_DELETION_SERVICE_ID and that the service is connected in the same account.",
    email_quota_exceeded:"The EmailJS account’s sending quota or plan limit was reached. Check the account’s usage before retrying.",
  };
  if(providerMessages[code])return providerMessages[code];
  if(emailMessages[code])return emailMessages[code];
  if(code==="firestore_indexes_required")return "The new Firestore indexes need an approved deployment before this query can run.";
  return messages[code] || code.replace(/_/g," ").replace(/^./,c=>c.toUpperCase());
}
export async function taskRequest<T>(path:string,body?:unknown):Promise<T>{
  const user=auth.currentUser;if(!user)throw new Error("admin_sign_in_required");
  const response=await fetch(path,{method:body===undefined?"GET":"POST",credentials:"same-origin",headers:{Authorization:`Bearer ${await user.getIdToken()}`,...(body===undefined?{}:{"Content-Type":"application/json"})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const result=await response.json();if(!response.ok)throw new Error(result.error || "task_service_unavailable");return result;
}
