import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
export async function PATCH(request:Request) {
 if(!originAllowed(request))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});
 try {await mutate(d=>{d.notifications.forEach(n=>n.read=true);});return Response.json({ok:true});}catch{return Response.json({error:'Notifikasi gagal diperbarui.'},{status:500});}
}
