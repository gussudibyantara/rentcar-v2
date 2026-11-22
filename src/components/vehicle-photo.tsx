'use client';
import {useState} from 'react';
import VehicleSymbol from './vehicle-symbol';
import type {Unit} from '@/lib/types';
import {vehiclePhotoSources} from '@/lib/vehicle-images';
export default function VehiclePhoto({unit}:{unit:Unit}){
 const [failed,setFailed]=useState<string[]>([]);const src=vehiclePhotoSources(unit).find(src=>!failed.includes(src));
 return src?<img src={src} alt={unit.name} loading="lazy" decoding="async" title={src.startsWith('/images/')?'Foto referensi model kendaraan; warna dan varian dapat berbeda.':undefined} onError={()=>setFailed(list=>[...list,src])}/>:<div style={{background:unit.color}}><VehicleSymbol unit={unit} size={62} strokeWidth={1}/><small>{unit.brand||unit.name.split(' ')[0]} · {unit.category}</small></div>;
}
