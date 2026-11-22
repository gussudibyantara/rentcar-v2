'use client';
import DatePicker from './date-picker';
interface DateFieldProps {id?:string;name?:string;type:'date'|'datetime-local';value:string;onChange:(event:{target:{value:string}})=>void;required?:boolean;disabled?:boolean;min?:string;max?:string;'aria-label'?:string}
/** Date/date-time field adapter. All calendar visuals and interactions live in DatePicker. */
export default function DateField({type,onChange,...props}:DateFieldProps){return <DatePicker {...props} withTime={type==='datetime-local'} onChange={value=>onChange({target:{value}})}/>;}
