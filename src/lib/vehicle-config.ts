import type {Unit,Inspection,VehicleCategory,InspectionEquipment} from './types';
export const vehicleCategories=['Mobil','Minibus','Motor'] as const;
export const motorcycleTypes={matic:'Matic',bebek:'Bebek',sport:'Sport',other:'Lainnya'};
export const transmissions={automatic:'Otomatis',semi_automatic:'Semi-otomatis',manual:'Manual'};
export const motorChecklist=[
 {id:'body',label:'Bodi dan panel',group:'Eksterior'},
 {id:'mirrors',label:'Spion',group:'Eksterior'},
 {id:'lights',label:'Lampu dan sein',group:'Eksterior'},
 {id:'tires',label:'Ban dan velg',group:'Mekanis'},
 {id:'brakes',label:'Rem',group:'Mekanis'},
 {id:'engine',label:'Mesin dan cairan',group:'Mekanis'},
 {id:'horn',label:'Klakson',group:'Mekanis'},
 {id:'seats',label:'Jok dan bagasi',group:'Kondisi motor'},
 {id:'cleanliness',label:'Kebersihan motor',group:'Kondisi motor'},
 {id:'equipment',label:'Kondisi perlengkapan pinjaman',group:'Kelengkapan'},
 {id:'documents',label:'Dokumen dan kunci',group:'Kelengkapan'},
];
export const motorPhotoViews=[{id:'front',label:'Depan'},{id:'rear',label:'Belakang'},{id:'left',label:'Kiri'},{id:'right',label:'Kanan'},{id:'seat',label:'Jok / bagasi'}];
export const inspectionCategory=(inspection:Inspection,unit?:Unit):VehicleCategory=>inspection.vehicleCategory||unit?.category||'Mobil';
/** Snapshot expected quantities server-side; actual quantities always start at zero. */
export function standardEquipment(unit:Unit):InspectionEquipment[]{
 if(unit.category!=='Motor')return [];
 const e=unit.equipment;return [
  {id:'helmets',name:'Helm',expected:e?.helmets||0,quantity:0},
  {id:'raincoats',name:'Jas hujan',expected:e?.raincoats||0,quantity:0},
  {id:'spare-key',name:'Kunci cadangan',expected:e?.spareKey?1:0,quantity:0},
  ...(e?.extras||[]).map(item=>({id:item.id,name:item.name,expected:item.quantity,quantity:0})),
 ].filter(item=>item.expected>0);
}
export function inspectionEquipment(inspection:Inspection,unit:Unit,baseline?:Inspection):InspectionEquipment[]{
 if(inspection.equipment)return inspection.equipment;
 if(inspectionCategory(inspection,unit)!=='Motor')return [];
 if(inspection.type==='checkin')return (baseline?.equipment||[]).filter(item=>item.quantity>0).map(item=>({...item,expected:item.quantity,quantity:0}));
 return standardEquipment(unit);
}
export function equipmentShortages(inspection:Inspection){return inspection.type==='checkin'?(inspection.equipment||[]).filter(item=>item.quantity<item.expected):[];}
