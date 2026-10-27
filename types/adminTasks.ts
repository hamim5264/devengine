export type AdminTaskStatus = "todo" | "in_progress" | "blocked" | "completed";
export type AdminTaskPriority = "low" | "medium" | "high" | "urgent";
export interface AdminTaskInput {
  title:string; description:string; status:AdminTaskStatus; priority:AdminTaskPriority;
  localStart:string; localDue:string; timezone:string; category:string; project:string;
  tags:string[]; subtasks:{id:string;title:string;done:boolean}[]; assigneeUid:string;
  links:string[]; notes:string; reminderMinutes:number[]; calendarEnabled:boolean; emailEnabled:boolean;
}
export interface AdminTask extends AdminTaskInput {
  id:string; ownerUid:string; revision:number; createdAt:string; updatedAt:string; completedAt:string|null;
  startAt:string|null; dueAt:string|null; dueAtMs:number|null; archived:boolean; deleted:boolean; assigneeName:string;
  calendar:{status:string;eventId?:string;eventUrl?:string|null;lastSyncedAt?:string;error?:string|null};
}
export interface TaskActivity {id:string;event:string;at:string;actorUid:string;error?:string;revision:number}
export interface TaskEmailPreferences {enabled:boolean;events:string[]}
export interface TaskSettings {
  people:{uid:string;name:string}[];
  summary:{total:number;pending:number;inProgress:number;completed:number;overdue:number}|null;
  setupWarnings?:string[];
  upcoming?:AdminTask[];
  calendar:{configured:boolean;connected:boolean;error?:string;accountLabel?:string;expiresAt?:string;calendar?:string};
  email:{configured:boolean;missing:string[];sharedService?:string;preferences?:TaskEmailPreferences};schedulerConfigured:boolean;identityMode:string;
  failures:{id:string;taskId:string;kind:string;error:string;status:string;attempts:number}[];
}
