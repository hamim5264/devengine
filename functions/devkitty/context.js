const { navigation, rank } = require('./navigation');
const { string } = require('./config');
const asText = value => {
  if (value?.toDate) return value.toDate().toISOString();
  if (typeof value === 'string') return value.slice(0, 7000);
  if (Array.isArray(value)) return value.slice(0, 18).map(item => typeof item === 'object' ? JSON.stringify(item).slice(0, 700) : String(item)).join('\n');
  if (value && typeof value === 'object') return JSON.stringify(value).slice(0, 7000);
  return typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
};
function picked(data, fields) { return fields.map(key => data[key] != null ? `${key}: ${asText(data[key])}` : '').filter(Boolean).join('\n'); }
async function collectContext(db, actor, settings, question) {
  const records = [], failures = [];
  const links = navigation(actor);
  async function doc(path, title, url, fields) {
    try { const snapshot = await db.doc(path).get(); if (snapshot.exists) records.push({ title, url, content: picked(snapshot.data(), fields) }); }
    catch { failures.push(title); }
  }
  async function query(collection, field, value, title, url, fields, dynamicUrl) {
    try {
      const result = await db.collection(collection).where(field, '==', value).limit(80).get();
      result.docs.forEach(snapshot => {
        const data = snapshot.data();
        if (collection === 'job_circulars' && data.deadlineDate && Date.parse(data.deadlineDate) < Date.now()) return;
        records.push({ title: string(data.title || data.name || title, 200), url: dynamicUrl ? dynamicUrl(data, snapshot.id) : url, content: picked(data, fields) });
      });
      if (result.empty) records.push({ title, url, content: 'No matching records currently exist.' });
      if (result.size === 80) failures.push(`${title}: limited to 80 matching records; do not present this as a complete company-wide list.`);
    } catch { failures.push(title); }
  }
  const reads = [doc('studio_about/founder', 'About DevEngine', '/about', ['name','title','headline','bio','location','portfolioUrl']), doc('app_settings/pdf_branding', 'Company contact', '/contact', ['companyLegalName','companyEmail','companyWebsiteUrl','contactPhone','companyAddress'])];
  if (/blog|article|chronicle|post|ব্লগ|লেখা/i.test(question)) reads.push(query('blogs','isPublished',true,'Published blog','/blog',['title','subtitle','excerpt','content','category','tags','publishedAt'], (data,id) => `/blog/${encodeURIComponent(data.slug || id)}`));
  if (/project|product|app|pricing|price|buy|প্রজেক্ট|অ্যাপ|দাম/i.test(question)) reads.push(query('projects','isPublic',true,'Published projects','/projects',['title','subtitle','category','description','details','tags','tools','price','discount','pricing','pricingPlans'], (data,id) => `/projects/${encodeURIComponent(data.slug || id)}`));
  if (/service|develop|website|build|flutter|সেবা|তৈরি/i.test(question)) reads.push(query('services','isPublic',true,'Public services','/services',['title','tagline','description','deliverables','techStack','timeline']));
  if (/career|job|hiring|vacancy|চাকরি/i.test(question)) reads.push(query('job_circulars','status','open','Open careers','/careers',['title','roleTitle','department','employmentType','location','experienceLevel','salaryRange','overview','description','responsibilities','requirements','deadlineDate']));
  if (/privacy|terms|refund|license|policy|শর্ত|গোপন/i.test(question)) reads.push(doc('privacy_config/main','Privacy policy','/privacy-policy',['title','content','sections','lastUpdated']),doc('terms_config/main','Terms','/terms',['title','content','sections','lastUpdated']));
  if (/refund|return|money.back|ফেরত/i.test(question)) reads.push(doc('refund_config/main','Refund policy','/refund-policy',['title','content','sections','lastUpdated']));
  if (/security|vulnerability|protection|নিরাপত্তা/i.test(question)) reads.push(doc('security_config/main','Security protocol','/security-protocol',['title','subtitle','sections','content','lastUpdated']));
  if (/license|licensing|source.ownership/i.test(question)) reads.push(doc('license_config/main','Source licensing','/terms',['title','content','sections','lastUpdated']));
  if (/documentation|docs|install|setup|api|গাইড/i.test(question)) reads.push(doc('documentation_config/main','Documentation','/documentation',['title','subtitle','sections','quickStart','installation']));
  try {
    const knowledge = await db.collection('devkitty_knowledge').where('enabled','==',true).limit(200).get();
    knowledge.docs.forEach(snapshot => { const data = snapshot.data(); if (Array.isArray(data.audiences) && data.audiences.includes(actor.role)) records.push({ title: string(data.title,160), url: typeof data.url === 'string' && links.some(link => link.url === data.url) ? data.url : '', content: `${string(data.content,12000)}\n${string(data.keywords,500)}` }); });
  } catch { failures.push('Custom knowledge'); }
  if (actor.role === 'employee' && settings.employeeDataEnabled) {
    const staff = actor.staff;
    records.push({ title: 'Your employee profile', url:'/staff/dashboard',content:picked(staff,['name','staffType','employmentType','joiningDate','assignedOffDays','shiftHours','allowedModules','allowedSubModules']) });
    reads.push(query('employee_tasks','assignedToStaffUid',actor.uid,'Your assigned tasks','/staff/tasks',['title','description','status','priority','startDate','startTime','dueDate','dueTime','progressPercent','estimatedHours','loggedHours','adminFeedback']));
    if (/attendance|shift|punch|break|today|উপস্থিতি/i.test(question)) reads.push(query('staff_attendance','staffUid',actor.uid,'Your attendance','/staff/attendance',['date','clockInTime','clockOutTime','totalHours','netWorkHours','status']));
    if (/leave|swap|off.day|request|holiday|ছুটি/i.test(question)) reads.push(query('staff_leave_requests','staffUid',actor.uid,'Your leave requests','/staff/leaves',['leaveType','startDate','endDate','totalDays','status','adminRemark']),query('staff_offday_swap_requests','staffUid',actor.uid,'Your off-day swaps','/staff/leaves',['currentOffDate','requestedWorkDate','status','adminRemark']));
    if (/work|report|update|blocker|কাজ|রিপোর্ট|আপডেট/i.test(question)) reads.push(query('staff_work_updates','staffUid',actor.uid,'Your work reports','/staff/work-updates',['date','tasksCompleted','tasksInProgress','blockers','hoursWorked','adminFeedback','reviewedByAdmin']));
    if (/certificate|সনদ/i.test(question)) reads.push(query('employee_certificates','employeeId',actor.uid,'Your certificates','/staff/certificates',['type','status','customTitle','createdAt','issuedAt','rejectionReason']));
    if (/agreement|contract|salary|pay|compensation|চুক্তি|বেতন/i.test(question)) {
      const salary = staff.salaryManagement || {};
      records.push({ title:'Your compensation summary',url:'/staff/agreement',content:picked(salary,['basicSalary','grossSalary','currency','noticePeriodDays']) });
      if (staff.agreementId && !String(staff.agreementId).includes('/')) reads.push(doc(`agreements/${staff.agreementId}`,'Your agreement','/staff/agreement',['agreementNumber','status','agreementTypeLabel','updatedAt']));
    }
  }
  if (actor.role === 'admin' && settings.adminDataEnabled) {
    if (/employee|staff|team|suspend|কর্মচারী/i.test(question)) {
      for (const status of ['active','suspended']) reads.push(query('staff_members','status',status,`${status} employees`,'/admin/manage-staff',['name','staffType','status','employmentType','joiningDate','assignedOffDays','shiftHours','allowedModules','allowedSubModules']));
    }
    if (/task|work|report|sprint|কাজ|রিপোর্ট/i.test(question)) {
      for (const status of ['todo','in_progress','in_review','blocked']) reads.push(query('employee_tasks','status',status,`${status} tasks`,'/admin/manage-work-updates',['title','assignedToName','status','priority','dueDate','progressPercent','estimatedHours']));
    }
    if (/leave|approval|ছুটি/i.test(question)) reads.push(query('staff_leave_requests','status','pending','Pending leaves','/admin/manage-leaves',['staffName','leaveType','startDate','endDate','totalDays','status']));
    if (/order|payment|sales|revenue|commerce|অর্ডার|পেমেন্ট/i.test(question)) {
      try { const snap = await db.collection('orders').limit(100).get(); records.push({title:'Order sample',url:'/admin/manage-orders',content:JSON.stringify({sampleSize:snap.size,complete:snap.size<100,statusCounts:snap.docs.reduce((map,item)=>{const status=String(item.data().status||'unknown');map[status]=(map[status]||0)+1;return map;},{})})}); } catch { failures.push('Orders'); }
    }
  }
  await Promise.all(reads);
  if (actor.role === 'employee' && /department|group|team|notice|announcement|বিভাগ|ঘোষণা/i.test(question)) {
    try {
      const departments = await db.collection('studio_departments').where('memberIds','array-contains',actor.uid).limit(30).get();
      departments.docs.forEach(snapshot => { if (!snapshot.data().deleted) records.push({title:snapshot.data().title,url:'/staff/departments',content:picked(snapshot.data(),['title','description'])}); });
      const notices = await db.collection('studio_notices').limit(25).get();
      notices.docs.forEach(snapshot => { const data=snapshot.data(); if(!data.deleted) records.push({title:data.title||'Company notice',url:'/staff/notices',content:picked(data,['title','body','content','createdAt'])}); });
    } catch { failures.push('Departments and notices'); }
  }
  records.forEach(record => { record.score = rank(`${record.title} ${record.content}`,question); });
  records.sort((a,b)=>b.score-a.score);
  let budget=20000;
  const selected=[];
  for (const record of records.slice(0,20)) {
    const text=record.content.slice(0,Math.min(5500,budget));
    if (text.length<20) continue;
    selected.push({title:record.title,url:record.url,content:text}); budget-=text.length;
    if (budget<100) break;
  }
  const recordLinks=selected.filter(record=>record.url).map(({title,url})=>({title,url,keywords:title}));
  const allowedLinks=[...new Map([...links,...recordLinks].map(link=>[link.url,link])).values()];
  const related=allowedLinks.map(link=>({...link,score:rank(`${link.title} ${link.keywords}`,question)})).filter(link=>link.score>0).sort((a,b)=>b.score-a.score).slice(0,3).map(({title,url})=>({title,url}));
  return { records:selected, failures, allowedLinks, related, navigation:links.map(({title,url})=>({title,url})) };
}
module.exports={collectContext};
