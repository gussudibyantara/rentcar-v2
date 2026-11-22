export type EmployeeRole='booking'|'delivery'|'inspection'|'maintenance'|'payment';
export interface Employee {id:string;name:string;phone:string;email:string;position:string;branch:Branch;roles:EmployeeRole[];notes:string;archivedAt?:string;revision:number;requestId?:string;createdAt:string}
export type BookingStatus = 'confirmed' | 'running' | 'completed' | 'returned' | 'cancelled';
/** Compatibility metadata only; branch management and filtering have been removed. */
export type Branch = string;
export interface BranchOffice {id:string;name:string;code:string;address:string;city:string;phone:string;email:string;managerId:string;notes:string;revision:number;createdAt:string;requestId?:string;archivedAt?:string}
export type VehicleCategory='Mobil'|'Minibus'|'Motor';
export interface UnitEquipment {helmets:number;raincoats:number;spareKey:boolean;extras:{id:string;name:string;quantity:number}[]}
export interface InspectionEquipment {id:string;name:string;expected:number;quantity:number}
export interface Unit {motorcycleType?:'matic'|'bebek'|'sport'|'other'|'';transmission?:'automatic'|'semi_automatic'|'manual'|'';engineCC?:number;vehicleColor?:string;chassisNumber?:string;engineNumber?:string;equipment?:UnitEquipment; id: string; name: string; plate: string; category: VehicleCategory; branch: Branch; owner: string; rate: number; condition: 'ready' | 'maintenance' | 'inactive'; color: string; brand?: string; model?: string; year?: number; weeklyRate?: number; monthlyRate?: number; deposit?: number; mileage?: number; operatingHours?: number; ownership?: 'owned'|'leased'|'partner'; partnerId?: string; notes?: string; photoId?: string; documents?: VehicleDocument[]; archivedAt?: string; revision?: number; requestId?: string }
export interface Customer { id: string; name: string; type: 'Individual' | 'Business'; email: string; phone?: string; address?: string; identityNumber?: string; licenseNumber?: string; licenseExpiry?: string; companyNumber?: string; contactPerson?: string; billingContact?: string; notes?: string; attachments?: string[]; status?: 'active'|'blocked'; statusReason?: string; archivedAt?: string; revision?: number; requestId?: string; createdAt?: string }
export interface BookingPaymentSetup {receivedByEmployeeId?:string;receivedBy?:string; customerKind:'consumer'|'rental_partner'; mode:'unpaid'|'dp'|'full'|'after_return'; amount:number; method?:'transfer'|'cash'|'qris'; date?:string; reference:string }
export interface Booking {picEmployeeId?:string;deliveryEmployeeId?:string;deliveryBy?:string;returnEmployeeId?:string;returnBy?:string; paymentSetup?:BookingPaymentSetup; initialPayment?:InvoicePayment; partnerTerms?:BookingPartnerTerms; id: string; customerId: string; unitId: string; start: string; end: string; status: BookingStatus; total: number; paid: number; pic: string; notes: string; createdAt: string; requestId?: string; revision?: number; actualStart?: string; actualEnd?: string; history?: BookingChange[] }
export interface Notice { id: string; title: string; description: string; read: boolean; bookingId?: string; unitId?: string; maintenanceId?: string; inspectionId?: string; invoiceId?: string; partnerId?:string; settlementId?:string; kind: 'booking' | 'payment' | 'maintenance' | 'inspection' | 'unit' | 'customer' | 'expense' | 'invoice' | 'partner' | 'employee' | 'branch' }
export interface Activity { id: string; title: string; description: string; at: string; kind: 'booking' | 'payment' | 'maintenance' | 'inspection' | 'unit' | 'customer' | 'expense' | 'invoice' | 'partner' | 'employee' | 'branch' }
export interface DashboardData {accountProfiles?:Record<string,import('./account-types').AccountProfile>;workspaceSettings?:import('./account-types').WorkspaceSettings;billing?:import('./account-types').BillingState;runtime?:{storage:'postgresql'|'local';user?:{name:string;email:string}};branches?:BranchOffice[];employees?:Employee[]; version: 1; referenceDate: string; units: Unit[]; customers: Customer[]; bookings: Booking[]; notifications: Notice[]; activities: Activity[]; assets?: Asset[]; maintenance?: Maintenance[]; inspections?: Inspection[]; expenses?: Expense[]; invoices?: Invoice[]; partners?:Partner[]; partnerAgreements?:PartnerAgreement[]; settlements?:PartnerSettlement[] }
export type BookingInput = Pick<Booking, 'customerId' | 'unitId' | 'start' | 'end' | 'pic' | 'notes' | 'picEmployeeId' | 'deliveryEmployeeId' | 'deliveryBy' | 'returnEmployeeId' | 'returnBy'> & { requestId: string };

export interface BookingSnapshot {picEmployeeId?:string;deliveryEmployeeId?:string;deliveryBy?:string;returnEmployeeId?:string;returnBy?:string; customerId: string; unitId: string; start: string; end: string; total: number; status: BookingStatus; pic: string; notes: string }
export interface BookingChange { at: string; action: 'updated' | 'cancelled'; reason: string; before: BookingSnapshot; after: BookingSnapshot }

export interface Asset { id: string; name: string; mime: string; size: number; createdAt: string }
export interface VehicleDocument { id: string; type: string; number: string; expiresOn: string; assetId: string }
export interface Maintenance {picEmployeeId?:string;
 id: string; unitId: string; title: string; type: 'routine'|'repair'|'inspection'|'replacement'|'cleaning'|'other';
 status: 'scheduled'|'in_progress'|'completed'|'cancelled'; start: string; end: string; provider: string; pic: string;
 scheduleType: 'date'|'mileage'|'hours'; dueMileage?: number; dueHours?: number; estimatedCost: number; actualCost?: number;
 notes: string; attachments: string[]; createdAt: string; startedAt?: string; completedAt?: string; revision: number; requestId?: string;
 nextDueDate?: string; nextDueMileage?: number; nextDueHours?: number; inspectionId?: string; damageIds: string[];
 history: {at:string;action:string;note:string}[];
}
export type CheckCondition = 'unchecked'|'good'|'warning'|'damaged';
export type InspectionSide = 'front'|'rear'|'left'|'right'|'interior'|'seat';
export interface Damage { side?:InspectionSide; photos?:string[]; id: string; area: string; description: string; severity: 'minor'|'major'; estimatedCost: number; requiresRepair: boolean; resolved: boolean; maintenanceId?: string }
export interface Inspection {vehicleCategory?:VehicleCategory;equipment?:InspectionEquipment[];inspectorEmployeeId?:string;
 id: string; bookingId: string; unitId: string; type: 'checkout'|'checkin'; status: 'scheduled'|'in_progress'|'completed'|'cancelled';
 scheduledAt: string; inspector: string; notes: string; mileage?: number; fuel?: number; checklist: Record<string,CheckCondition>;
 photos: {view:string;assetId:string}[]; damages: Damage[]; customerName: string; accepted: boolean; baselineMissingReason: string;
 createdAt: string; startedAt?: string; completedAt?: string; revision: number; requestId?: string;
}

export interface Expense {handledByEmployeeId?:string;handledBy?:string; borneBy?:'operator'|'owner'; settlementId?:string; id:string; title:string; category:'fuel'|'maintenance'|'cleaning'|'salary'|'office'|'partner'|'other'; amount:number; date:string; branch:Branch; recipient:string; method:'transfer'|'cash'|'qris'; status:'unpaid'|'paid'|'void'; paidOn:string; unitId:string; bookingId:string; maintenanceId:string; attachments:string[]; notes:string; createdAt:string; revision:number; requestId?:string; history:{at:string;action:string;note:string}[] }

export interface InvoiceLine {id:string;description:string;quantity:number;price:number}
export interface InvoiceCompany {name:string;address:string;phone:string;email:string;logoId:string;paymentInstructions:string}
export interface InvoicePayment {receivedByEmployeeId?:string;receivedBy?:string;id:string;amount:number;method:'opening'|'transfer'|'cash'|'qris';date:string;reference:string;notes:string;attachments:string[];createdAt:string;requestId?:string;reversedAt?:string;reversalReason?:string}
export interface Invoice {id:string;number:string;bookingId:string;status:'draft'|'issued'|'void';issueDate:string;dueDate:string;company:InvoiceCompany;lines:InvoiceLine[];discount:number;taxRate:number;subtotal:number;tax:number;total:number;notes:string;terms:string;createdAt:string;issuedAt?:string;voidedAt?:string;revision:number;requestId?:string;bookingRevision:number;source:{baseTotal:number;customerId:string;unitId:string;start:string;end:string;branch:Branch;customer:{name:string;email:string;phone:string;address:string;billingContact:string};unit:{name:string;plate:string}};payments:InvoicePayment[];history:{at:string;action:string;note:string}[]}

export interface Partner {id:string;kind?:'individual'|'company';name:string;phone:string;email:string;address:string;bank:string;notes:string;archivedAt?:string;revision:number;createdAt:string;requestId?:string}
export interface PartnerAgreement {id:string;partnerId:string;unitId:string;type:'daily'|'share'|'monthly';rate:number;shareAfterCosts:boolean;start:string;end:string;notes:string;createdAt:string;requestId?:string}
export type BookingPartnerTerms={kind:'owned'}|{kind:'partner';agreement:PartnerAgreement;partnerName:string};
export interface PartnerReportRow {key:string;unitId:string;unitName:string;plate:string;branch:Branch;partnerId:string;partnerName:string;bookingIds:string[];bookings:number;days:number;revenue:number;ownerGross:number;ownerDeductions:number;operatorCosts:number;overhead:number;payable:number;margin:number|null;unknown:string[];provisional:boolean;details:{bookingId:string;start:string;end:string;days:number;ownerGross:number;scheme:string}[]}
export interface PartnerSettlement {id:string;number:string;partnerId:string;month:string;status:'final'|'void';partner:Pick<Partner,'name'|'phone'|'email'|'address'|'bank'>;companyName:string;companyAddress:string;rows:PartnerReportRow[];gross:number;deductions:number;total:number;notes:string;attachments:string[];createdAt:string;revision:number;requestId:string;payments:{handledByEmployeeId?:string;handledBy?:string;id:string;amount:number;date:string;method:'transfer'|'cash'|'qris';reference:string;attachments:string[];requestId:string;createdAt:string;expenseId:string;requestExpenseId?:string;branch:Branch;reversedAt?:string;reason?:string}[];credits?:{id:string;otherId:string;otherNumber?:string;direction:'in'|'out';amount:number;at:string}[];history:{at:string;action:string;note:string}[]}
