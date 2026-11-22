import { z } from 'zod';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { bookingSchema,createBooking } from '@/lib/booking-service';
import { apiError,FleetError } from '@/lib/api-utils';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!originAllowed(request))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});
 try{const input=bookingSchema.parse(await request.json());const booking=await mutate(data=>createBooking(data,input));return Response.json({booking},{status:201});}
 catch(error){if(error instanceof z.ZodError||error instanceof SyntaxError||error instanceof FleetError)return apiError(error);const message=(error as Error).message;const known=['Rekanan','Kendaraan','Waktu','Pelanggan'].some(s=>message.startsWith(s));return Response.json({error:known?message:'Booking gagal disimpan. Coba lagi.'},{status:known?409:500});}
}
