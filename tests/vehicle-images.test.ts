import {describe,it,expect} from 'vitest';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {defaultVehiclePhoto,vehiclePhotoSources,vehiclePhotoCredits} from '../src/lib/vehicle-images';
describe('vehicle reference photos',()=>{
 it.each([['Toyota Avanza 1.5G','toyota-avanza'],['Hiace Premiere','toyota-hiace'],['Toyota Innova Reborn','toyota-innova'],['Honda HR-V','honda-hrv'],['Suzuki XL7','suzuki-xl7'],['Mitsubishi Xpander','mitsubishi-xpander'],['Honda Brio','honda-brio'],['Toyota Fortuner','toyota-fortuner'],['Toyota Rush','toyota-rush'],['Daihatsu Terios','daihatsu-terios']])('matches %s to its own model', (name,id)=>expect(defaultVehiclePhoto({name})?.id).toBe(id));
 it('prioritizes uploaded photos and the name over stale optional model metadata',()=>{
  const unit={name:'Toyota Fortuner',model:'Avanza',brand:'Toyota',photoId:'my-upload'};
  expect(vehiclePhotoSources(unit)).toEqual(['/api/files/my-upload','/images/vehicles/toyota-fortuner.jpg']);
  expect(defaultVehiclePhoto({name:'Unit operasional',brand:'Toyota',model:'Avanza'})?.id).toBe('toyota-avanza');
 });
 it('does not invent a matching photo for unknown vehicles and keeps credit for every bundled file',()=>{
  expect(defaultVehiclePhoto({name:'Kendaraan khusus'})).toBeUndefined();expect(vehiclePhotoSources({name:'Kendaraan khusus'})).toEqual([]);
  expect(vehiclePhotoCredits).toHaveLength(10);for(const photo of vehiclePhotoCredits){expect(existsSync(resolve('public',photo.src.slice(1)))).toBe(true);expect(photo.author).toBeTruthy();expect(photo.license).toMatch(/^CC/);expect(photo.source).toMatch(/^https:\/\/commons.wikimedia.org\//);}
 });
});
