import {describe,it,expect,vi,afterEach} from 'vitest';
import {apiSave} from '../src/components/fleet-kit';
import {WORKSPACE_CHANGED} from '../src/lib/workspace-sync';
afterEach(()=>vi.unstubAllGlobals());
describe('cross-module mutation synchronization',()=>{
 it('notifies the workspace after a successful mutation without storing business data',async()=>{const target=new EventTarget(),handler=vi.fn(),setItem=vi.fn();target.addEventListener(WORKSPACE_CHANGED,handler);vi.stubGlobal('window',{dispatchEvent:target.dispatchEvent.bind(target),localStorage:{setItem}});vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({invoice:{id:'private-id',customer:'private-name'}})})));await apiSave('/api/invoices',{input:{}});expect(handler).toHaveBeenCalledTimes(1);expect(setItem).toHaveBeenCalledTimes(1);expect(JSON.stringify(setItem.mock.calls)).not.toContain('private');});
 it('does not report a failed write as a data change',async()=>{const dispatchEvent=vi.fn();vi.stubGlobal('window',{dispatchEvent,localStorage:{setItem:vi.fn()}});vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,json:async()=>({error:'Konflik revisi'})})));await expect(apiSave('/api/invoices',{})).rejects.toThrow('Konflik revisi');expect(dispatchEvent).not.toHaveBeenCalled();});
 it('does not turn a committed write into a save error when storage notifications are unavailable',async()=>{vi.stubGlobal('window',{dispatchEvent:vi.fn(),get localStorage(){throw new Error('Storage blocked');}});vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({ok:true})})));await expect(apiSave('/api/expenses',{})).resolves.toEqual({ok:true});});
});
