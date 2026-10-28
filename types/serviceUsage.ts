import type {DevKittyInsights} from './devkitty';
export interface CostRow {month:string;service:string;currency:string;net:number;gross?:number;credits?:number}
export interface SourceStatus {status:string;missing?:string[];description?:string;partial?:boolean}
export interface CostSource extends SourceStatus {rows?:CostRow[];scope?:string}
export interface EmailQuotaInfo {limit:number;received:number;remaining:number;resetsOn:string;monthlyPlan?:string}
export interface EmailAccountDetails {serviceId:string;templateId?:string;deletionTemplateId?:string;taskTemplateId?:string;status:string;role:string;quota?:string;remaining?:number;resetsOn?:string}
export interface ServiceUsageReport {
 checkedAt:string;year:number;period?:string;periodLabel?:string;projectId:string;reportMonth:string;cached?:boolean;
 provider:DevKittyInsights['provider']&{keyStatus?:string;creditsStatus?:string};
 usageReport:SourceStatus&{since?:string;models?:DevKittyInsights['usageReport']['models']};
 firestore:SourceStatus&{periodStart?:string;metrics?:Record<string,SourceStatus&{value?:number|null}>};
 googleCloud:CostSource;vercel:CostSource;
 email:SourceStatus&{accepted?:number;failed?:number;uncertain?:number;testAccepted?:number;scope?:string;quota?:EmailQuotaInfo;accounts?:{contact?:EmailAccountDetails;shared?:EmailAccountDetails}};
}
