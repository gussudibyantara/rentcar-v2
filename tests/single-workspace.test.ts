import {describe,it,expect} from 'vitest';
import {makeEmptyData} from '../src/lib/empty-data';
import {makeSeed} from '../src/lib/seed';
import {unitSchema} from '../src/lib/fleet-schema';
import {saveUnit,archiveUnit} from '../src/lib/fleet-service';
import {employeeSchema,saveEmployee,employeeStatus} from '../src/lib/employee-service';
import {expenseSchema,saveExpense} from '../src/lib/office-service';
import {reportData,reportCSV} from '../src/lib/reports';
import {addDemoData} from '../src/lib/demo-data';
const unitInput={name:'Unit uji',plate:'DR 9999 QA',category:'Mobil',owner:'Armada sendiri',ownership:'owned',brand:'Toyota',model:'Avanza',year:2025,rate:300000,weeklyRate:0,monthlyRate:0,deposit:0,mileage:0,operatingHours:0,condition:'ready',notes:'',photoId:'',documents:[]};
describe('single operational workspace',()=>{
 it('creates and restores vehicles and employees without any branch registry or field',()=>{
  const data=makeEmptyData();expect(data.branches).toBeUndefined();
  const input=unitSchema.parse(unitInput),unit=saveUnit(data,input);expect(unit.branch).toBe('');archiveUnit(data,unit.id,unit.revision!,false);archiveUnit(data,unit.id,unit.revision!,true);expect(unit.archivedAt).toBeUndefined();
  const employee=saveEmployee(data,employeeSchema.parse({name:'Petugas Uji',phone:'',email:'',position:'Admin',roles:['booking'],notes:''}));expect(employee.branch).toBe('');employeeStatus(data,employee.id,employee.revision,false);employeeStatus(data,employee.id,employee.revision,true);expect(employee.archivedAt).toBeUndefined();
 });
 it('links expenses to vehicles with legacy locations without branch validation',()=>{
  const data=makeSeed(),before=structuredClone(data.units),unit=data.units[0];
  const input=expenseSchema.parse({title:'Cuci kendaraan',category:'cleaning',amount:50000,date:'2026-11-01',recipient:'Penyedia uji',method:'cash',status:'unpaid',paidOn:'',unitId:unit.id,bookingId:'',maintenanceId:'',attachments:[],notes:''});
  expect(input.branch).toBe('');const expense=saveExpense(data,input);expect(expense.unitId).toBe(unit.id);expect(data.units).toEqual(before);
 });
 it('aggregates all legacy locations even when an old branch filter is supplied',()=>{
  const data=makeSeed(),snapshot=structuredClone(data),filter={from:'2020-01-01',to:'2030-12-31',unitId:'',category:''};
  const all=reportData(data,filter),legacy=reportData(data,{...filter,branch:'a retired location'});expect(legacy).toEqual(all);expect(all.rows).toHaveLength(data.units.length);expect(reportCSV(data,{...filter,branch:'Legacy'})).not.toContain('Legacy');expect(data).toEqual(snapshot);
 });
 it('does not generate branch records while keeping the other demo modules linked',()=>{
  const result=addDemoData(makeEmptyData()).data;expect(result.branches).toBeUndefined();expect(result.units).toHaveLength(10);expect(result.employees).toHaveLength(10);expect(result.bookings).toHaveLength(10);expect(result.units.every(u=>u.branch==='')).toBe(true);
 });
});
