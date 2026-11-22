import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {fail,revision} from './api-utils';
import {subscriptionPlans} from './account-plans';
import type {DashboardData} from './types';
import type {AccountIdentity,AccountProfile,WorkspaceSettings,BillingState,Subscription,SubscriptionOrder} from './account-types';
export const profileSchema=z.object({name:z.string().trim().min(2,'Nama minimal 2 karakter.').max(150),phone:z.string().trim().regex(/^(?:\+62[1-9]\d{7,12})?$/,'Gunakan nomor WhatsApp +62 yang valid.'),position:z.string().trim().max(100)}).strict();
export const settingsSchema=z.object({name:z.string().trim().min(2,'Nama usaha minimal 2 karakter.').max(150),email:z.union([z.email().max(254),z.literal('')]),phone:z.string().trim().max(30).regex(/^[+\d ()-]*$/,'Periksa nomor telepon usaha.'),address:z.string().trim().max(500),paymentInstructions:z.string().trim().max(1500)}).strict();
export const billingActionSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('order'),revision:z.number().int().nonnegative(),requestId:z.string().uuid(),plan:z.enum(['starter','pro','business']),months:z.union([z.literal(1),z.literal(6),z.literal(12)])}).strict(),
 z.object({action:z.literal('cancel-order'),revision:z.number().int().nonnegative(),id:z.string().uuid()}).strict(),
 z.object({action:z.enum(['downgrade','cancel-downgrade']),revision:z.number().int().nonnegative()}).strict(),
]);
export function defaultSettings():WorkspaceSettings{return {name:'BetterWorks Rental',email:'',phone:'',address:'',paymentInstructions:'',revision:0};}
export function defaultBilling():BillingState{return {revision:0,subscription:{plan:'free',months:1,startsAt:'',endsAt:''},orders:[]};}
export function activeSubscription(b:BillingState,now=new Date()):Subscription{
 const scheduled=b.scheduled&&+new Date(b.scheduled.startsAt)<=+now?b.scheduled:undefined;
 const s=scheduled||b.subscription;
 return s.plan!=='free'&&(!s.endsAt||+now>=+new Date(s.endsAt))?defaultBilling().subscription:s;
}
function advanceScheduledPeriod(b:BillingState,now:Date){if(b.scheduled&&+new Date(b.scheduled.startsAt)<=+now){b.subscription=b.scheduled;delete b.scheduled;}}
export function accountView(data:DashboardData,identity:AccountIdentity){const billing=data.billing||defaultBilling();return {identity,profile:data.accountProfiles?.[identity.id]||{name:identity.name,phone:'',position:'',revision:0},settings:data.workspaceSettings||defaultSettings(),billing,active:activeSubscription(billing)};}
export function saveProfile(data:DashboardData,identity:AccountIdentity,input:z.infer<typeof profileSchema>,expected:number){const old=data.accountProfiles?.[identity.id];revision(old?.revision,expected);const value:AccountProfile={...profileSchema.parse(input),revision:expected+1};data.accountProfiles||={};data.accountProfiles[identity.id]=value;return value;}
export function saveSettings(data:DashboardData,input:z.infer<typeof settingsSchema>,expected:number){revision(data.workspaceSettings?.revision,expected);data.workspaceSettings={...settingsSchema.parse(input),revision:expected+1};return data.workspaceSettings;}
export const planPrices=Object.fromEntries(subscriptionPlans.map(p=>[p.id,p.price])) as Record<'starter'|'pro'|'business',number>;
export function changeBilling(data:DashboardData,raw:unknown,now=new Date()){
 const input=billingActionSchema.parse(raw);const b=data.billing||defaultBilling();
 if(input.action==='order'){
  const existing=b.orders.find(o=>o.requestId===input.requestId);
  if(existing){if(existing.plan!==input.plan||existing.months!==input.months)fail('Permintaan ini sudah digunakan untuk pilihan lain.');return b;}
 }
 revision(b.revision,input.revision);
 advanceScheduledPeriod(b,now);
 const active=activeSubscription(b,now);
 if(input.action==='order'){
  if(b.orders.some(o=>o.status==='pending'))fail('Batalkan permintaan yang menunggu sebelum memilih paket lain.');
  if(b.scheduled&&+new Date(b.scheduled.startsAt)>+now)fail('Paket periode berikutnya sudah dibayar. Hubungi pengelola untuk perubahan.');
  if(active.plan===input.plan&&active.months===input.months&&!active.downgradeAt)fail('Paket dan durasi ini sudah aktif. Pilih durasi atau paket lain.');
  b.orders.unshift({id:randomUUID(),requestId:input.requestId,plan:input.plan,months:input.months,amount:planPrices[input.plan]*input.months,status:'pending',createdAt:now.toISOString()});
 }else if(input.action==='cancel-order'){
  const order=b.orders.find(o=>o.id===input.id);if(!order||order.status!=='pending')fail('Permintaan ini tidak dapat dibatalkan.');order.status='cancelled';
 }else{
  if(active.plan==='free')fail('Workspace sudah menggunakan Free.');
  if(b.scheduled&&+new Date(b.scheduled.startsAt)>+now)fail('Paket berikutnya sudah dibayar. Hubungi pengelola untuk perubahan.');
  if(input.action==='downgrade'){
   if(b.orders.some(o=>o.status==='pending'))fail('Batalkan permintaan upgrade terlebih dahulu.');
   if(active.downgradeAt)fail('Downgrade sudah dijadwalkan.');
   active.downgradeAt=active.endsAt;
  }else{if(!active.downgradeAt)fail('Tidak ada jadwal downgrade.');delete active.downgradeAt;}
 }
 b.revision++;data.billing=b;return b;
}
/** Internal gateway boundary. Never expose as a client-callable activation endpoint.
 * The future Mayar adapter must verify its notification and retrieve the paid
 * transaction server-to-server before calling this inside mutate(). */
export function applyVerifiedSubscriptionPayment(data:DashboardData,event:{orderId:string;reference:string;amount:number;currency:string},now=new Date()){
 const b=data.billing;if(!b)fail('Tagihan tidak ditemukan.',404);
 const order=b.orders.find(o=>o.id===event.orderId);if(!order)fail('Tagihan tidak ditemukan.',404);
 if(!event.reference.trim()||event.currency!=='IDR'||event.amount!==order.amount)fail('Pembayaran tidak sesuai tagihan.');
 if(order.status==='paid'){if(order.providerReference!==event.reference)fail('Tagihan sudah memiliki pembayaran lain.');return order;}
 if(order.status!=='pending')fail('Tagihan ini tidak menunggu pembayaran.');
 if(b.orders.some(o=>o.providerReference===event.reference))fail('Referensi pembayaran sudah digunakan.');
 if(b.scheduled&&+new Date(b.scheduled.startsAt)>+now)fail('Periode berikutnya sudah dibayar.');
 advanceScheduledPeriod(b,now);
 const current=activeSubscription(b,now);const starts=current.plan==='free'?now:new Date(current.endsAt);
 const ends=addBillingMonths(starts,order.months);
 const subscription:Subscription={plan:order.plan,months:order.months,startsAt:starts.toISOString(),endsAt:ends.toISOString()};
 if(current.plan==='free')b.subscription=subscription;else b.scheduled=subscription;
 Object.assign(order,{status:'paid',paidAt:now.toISOString(),providerReference:event.reference,startsAt:subscription.startsAt,endsAt:subscription.endsAt} satisfies Partial<SubscriptionOrder>);b.revision++;return order;
}
export function addBillingMonths(start:Date,months:number){const offset=8*3600000;const end=new Date(+start+offset);const day=end.getUTCDate();end.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+months);const last=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate();end.setUTCDate(Math.min(day,last));return new Date(+end-offset);}
