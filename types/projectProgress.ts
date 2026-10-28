export type ProgressStatus = 'planning' | 'in_progress' | 'review' | 'on_hold' | 'completed';
export interface ProgressMilestone { id:string; title:string; status:'pending'|'in_progress'|'completed'; dueDate:string; }
export interface ProgressUpdate { id:string; title:string; message:string; createdAt:string; author:string; }
export interface ProjectProgressPublic {
  title:string; client:string; summary:string; status:ProgressStatus; percent:number;
  nextStep:string; targetDate:string; milestones:ProgressMilestone[]; updates:ProgressUpdate[]; updatedAt:string;
}
export interface ProjectProgress extends ProjectProgressPublic {
  id:string; briefId:string; editorIds:string[]; ownerUid:string; createdAt:string; revision:number; shareToken?:string; shareEnabled:boolean;
}
export const PROGRESS_STATUSES:Record<ProgressStatus,string>={planning:'Planning',in_progress:'In progress',review:'Client review',on_hold:'On hold',completed:'Completed'};
