import credits from '../../public/images/vehicles/credits.json';
import type {Unit} from './types';
export const vehiclePhotoCredits=credits;
const models:[string,RegExp][]=[
 ['toyota-avanza',/\bavanza\b/],['toyota-innova',/\binnova\b/],['toyota-hiace',/\bhi\s*ace\b/],
 ['honda-brio',/\bbrio\b/],['honda-hrv',/\bhr\s*v\b/],['mitsubishi-xpander',/\bxpander\b/],
 ['suzuki-xl7',/\bxl\s*7\b/],['toyota-fortuner',/\bfortuner\b/],['toyota-rush',/\brush\b/],['daihatsu-terios',/\bterios\b/],
];
export function defaultVehiclePhoto(unit:Pick<Unit,'name'|'brand'|'model'>){
 for(const value of [unit.name,[unit.brand,unit.model].filter(Boolean).join(' ')]){
  const name=value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,' '),id=models.find(([,match])=>match.test(name))?.[0];
  if(id)return vehiclePhotoCredits.find(photo=>photo.id===id);
 }
 return undefined;
}
export function vehiclePhotoSources(unit:Pick<Unit,'name'|'brand'|'model'|'photoId'>&Partial<Pick<Unit,'category'>>){const fallback=unit.category==='Motor'?undefined:defaultVehiclePhoto(unit);return [...(unit.photoId?[`/api/files/${unit.photoId}`]:[]),...(fallback?[fallback.src]:[])];}
