export interface AccountProfile {name:string;phone:string;position:string;revision:number}
export interface WorkspaceSettings {name:string;email:string;phone:string;address:string;paymentInstructions:string;revision:number}
export type PaidPlan='starter'|'pro'|'business';
export type BillingTerm=1|6|12;
export interface Subscription {plan:PaidPlan|'free';months:BillingTerm;startsAt:string;endsAt:string;downgradeAt?:string}
export interface SubscriptionOrder {id:string;requestId:string;plan:PaidPlan;months:BillingTerm;amount:number;status:'pending'|'paid'|'cancelled'|'failed';createdAt:string;paidAt?:string;providerReference?:string;startsAt?:string;endsAt?:string}
export interface BillingState {revision:number;subscription:Subscription;scheduled?:Subscription;orders:SubscriptionOrder[]}
export interface AccountIdentity {id:string;name:string;email:string;provider:'native'|'local'}
export interface AccountView {identity:AccountIdentity;profile:AccountProfile;settings:WorkspaceSettings;billing:BillingState;active:Subscription}
