const PUBLIC = [
  ['DevEngine home', '/home', 'devengine studio company home ডেভইঞ্জিন'],
  ['Projects', '/projects', 'project app product buy pricing source code প্রজেক্ট অ্যাপ দাম'],
  ['Services', '/services', 'service development website mobile flutter build hire সেবা তৈরি'],
  ['Blog', '/blog', 'blog article chronicle post news engineering ব্লগ লেখা'],
  ['About & team', '/about', 'about team founder developer company hamim leon টিম পরিচয়'],
  ['Careers', '/careers', 'career job hiring vacancy apply কাজ চাকরি'],
  ['Documentation', '/documentation', 'documentation docs api setup install help গাইড'],
  ['Research lab', '/lab', 'lab research experiment prototypes ল্যাব গবেষণা'],
  ['Project archive', '/archive', 'archive portfolio case study completed আর্কাইভ'],
  ['Launchpad', '/launchpad', 'launchpad upcoming launch product roadmap লঞ্চ'],
  ['Refund policy', '/refund-policy', 'refund return purchase payment money back ফেরত'],
  ['Security protocol', '/security-protocol', 'security protection vulnerability নিরাপত্তা'],
  ['Contact', '/contact', 'contact email phone quotation support যোগাযোগ'],
  ['Privacy policy', '/privacy-policy', 'privacy data policy গোপনীয়তা'],
  ['Terms & conditions', '/terms', 'terms conditions legal শর্ত'],
];
const EMPLOYEE = [
  ['My dashboard', '/staff/dashboard', 'dashboard today shift overview ড্যাশবোর্ড'],
  ['My tasks', '/staff/tasks', 'task assignment progress deadline sprint today কাজ টাস্ক'],
  ['My attendance', '/staff/attendance', 'attendance punch clock shift break উপস্থিতি'],
  ['My agreement', '/staff/agreement', 'agreement salary contract employment চুক্তি বেতন'],
  ['Leave & off-day requests', '/staff/leaves', 'leave swap off day request holiday ছুটি'],
  ['Daily work updates', '/staff/work-updates', 'work update daily report submit blocker রিপোর্ট আপডেট'],
  ['Certificates', '/staff/certificates', 'certificate service experience সনদ'],
  ['Messages', '/staff/messages', 'message chat colleague admin মেসেজ চ্যাট'],
  ['Notifications', '/staff/notifications', 'notification alert activity বিজ্ঞপ্তি'],
  ['Departments', '/staff/departments', 'department group team বিভাগ'],
  ['Notice board', '/staff/notices', 'notice broadcast announcement ঘোষণা'],
];
const ADMIN = [
  ['Studio dashboard', '/admin/dashboard', 'dashboard analytics overview sales metrics ড্যাশবোর্ড'],
  ['Manage employees', '/admin/manage-staff', 'employee staff profile access suspend password কর্মচারী'],
  ['Work updates', '/admin/manage-work-updates', 'task assign work update report sprint কাজ রিপোর্ট'],
  ['Attendance', '/admin/manage-attendance', 'attendance shift punch উপস্থিতি'],
  ['Leave requests', '/admin/manage-leaves', 'leave approval request ছুটি'],
  ['Orders & payments', '/admin/manage-orders', 'order payment commerce customer অর্ডার পেমেন্ট'],
  ['Projects', '/admin/manage-projects', 'project catalog product প্রজেক্ট'],
  ['Manage blog', '/admin/manage-blog', 'blog article post ব্লগ'],
  ['Careers', '/admin/manage-careers', 'career job recruitment vacancy চাকরি'],
  ['Certificates', '/admin/manage-certificates', 'certificate issue সনদ'],
  ['Contracts', '/admin/contract-center', 'contract agreement quote client চুক্তি'],
  ['Project overviews & budgets', '/admin/project-briefs', 'budget proposal project plan pdf estimate বাজেট'],
  ['Messages', '/admin/messages', 'message chat মেসেজ'], ['Departments', '/admin/departments', 'department group team বিভাগ'],
  ['Notices', '/admin/notices', 'broadcast notice announcement ঘোষণা'], ['Notifications', '/admin/notifications', 'notification activity বিজ্ঞপ্তি'],
  ['DevKitty settings', '/admin/manage-devkitty', 'devkitty model behavior greeting api key kitty'],
  ['My profile', '/admin/profile', 'my profile avatar account প্রোফাইল'],
  ['Maintenance', '/admin/manage-maintenance', 'maintenance outage downtime'], ['Theme & fonts', '/admin/manage-theme-settings', 'theme font appearance light dark'],
];
const MODULES = {
  overview: [['Studio dashboard','/admin/dashboard']],
  commerce: [['Orders & payments','/admin/manage-orders'],['Currencies','/admin/manage-currencies'],['Invoice settings','/admin/manage-pdf-settings']],
  projects: [['Manage projects','/admin/manage-projects'],['Add project','/admin/add-project'],['Agreements','/admin/agreements']],
  contract_center: [['Contract center','/admin/contract-center']],
  content_cms: [['Manage blog','/admin/manage-blog'],['Manage careers','/admin/manage-careers'],['Manage services','/admin/manage-services'],['Landing content','/admin/manage-landing']],
  legal: [['App legal hub','/admin/manage-app-legal'],['Terms','/admin/manage-terms'],['Privacy policy','/admin/manage-privacy']],
  system: [['Maintenance','/admin/manage-maintenance'],['Recycle bin','/admin/manage-bin']],
  social_network: [['Social links','/admin/manage-socials'],['Network hubs','/admin/manage-network']],
};
function navigation(actor) {
  const rows=[...PUBLIC,...(actor.role==='employee'?EMPLOYEE:actor.role==='admin'?ADMIN:[])];
  if(actor.role==='employee') {
    const allowed=actor.staff.allowedModules || [], sub=actor.staff.allowedSubModules || {};
    for(const [key,items] of Object.entries(MODULES)) if(allowed.includes('all')||allowed.includes(key)) {
      rows.push(...items.filter(([,url])=>sub[key]===undefined||sub[key].includes(url)).map(([title,url])=>[title,url,`${key} ${title}`]));
    }
  }
  return rows.map(([title,url,keywords])=>({title,url,keywords}));
}
function terms(text) { return (String(text || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(value => value.length > 1 && !['the','and','about','please','bunny','kitty','devkitty','tell','what','with','have','this','that','your','আমার','আমাকে'].includes(value)); }
function rank(text, query) { const haystack = text.toLowerCase(); return terms(query).reduce((score, word) => score + (haystack.includes(word) ? word.length > 3 ? 3 : 1 : 0), 0); }
module.exports = { navigation, rank, terms };
