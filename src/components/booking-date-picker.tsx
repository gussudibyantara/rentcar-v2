'use client';
import DatePicker from './date-picker';
export default function BookingDatePicker({start,end,startTime,endTime,onChange,onOpenChange}:{start:string;end:string;startTime:string;endTime:string;onOpenChange:(open:boolean)=>void;onChange:(start:string,end:string,startTime:string,endTime:string)=>void}){
 return <DatePicker mode="range" withTime required min="2020-01-01T00:00" max="2100-12-31T23:59" label="Tanggal pengantaran & pengembalian" value={`${start}T${startTime}`} endValue={`${end}T${endTime}`} onOpenChange={onOpenChange} onChange={(from,to)=>{if(to)onChange(from.slice(0,10),to.slice(0,10),from.slice(11),to.slice(11));}}/>;
}
