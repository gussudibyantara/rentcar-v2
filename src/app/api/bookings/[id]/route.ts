import { employeeIdSchema } from '@/lib/employee-service';
import { FleetError,apiError } from '@/lib/api-utils';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { BookingError, changeBooking, assignBookingStaff } from '@/lib/booking-changes';
export const runtime = 'nodejs';
const fields = z.object({ picEmployeeId:employeeIdSchema,deliveryEmployeeId:employeeIdSchema,deliveryBy:z.string().max(100).optional(),returnEmployeeId:employeeIdSchema,returnBy:z.string().max(100).optional(), customerId: z.string().min(1).max(50), unitId: z.string().min(1).max(50), start: z.iso.datetime({ offset: true }), end: z.iso.datetime({ offset: true }), pic: z.string().trim().min(1).max(100), notes: z.string().trim().max(1000) });
const staffFields=fields.pick({pic:true,picEmployeeId:true,deliveryEmployeeId:true,deliveryBy:true,returnEmployeeId:true,returnBy:true});
const schema = z.discriminatedUnion('action', [
  z.object({action:z.literal('assign-staff'),revision:z.number().int().min(0),reason:z.string().trim().min(1).max(500),input:staffFields}),
  z.object({ action: z.literal('update'), revision: z.number().int().min(0), reason: z.string().trim().min(1, 'Alasan perubahan wajib diisi.').max(500), input: fields }),
  z.object({ action: z.literal('cancel'), revision: z.number().int().min(0), reason: z.string().trim().min(1, 'Alasan pembatalan wajib diisi.').max(500) }),
]);
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!originAllowed(request)) return Response.json({ error: 'Permintaan tidak diizinkan.' }, { status: 403 });
  try {
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const booking = await mutate(data => {
      const updated = input.action==='assign-staff'?assignBookingStaff(data,id,input.revision,input.reason,input.input):changeBooking(data, id, input.action, input.revision, input.reason, input.action === 'update' ? input.input : undefined);
      data.activities.unshift({ id: randomUUID(), title: input.action === 'cancel' ? 'Booking dibatalkan' : 'Booking diperbarui', description: `${id} · ${input.reason}`, at: new Date().toISOString(), kind: 'booking' });
      data.notifications.unshift({ id: randomUUID(), title: `${id} ${input.action === 'cancel' ? 'dibatalkan' : 'diperbarui'}`, description: input.reason, bookingId: id, kind: 'booking', read: false });
      return updated;
    });
    return Response.json({ booking });
  } catch (error) {
    if(error instanceof FleetError)return apiError(error);
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message || 'Data tidak valid.' }, { status: 400 });
    if (error instanceof SyntaxError) return Response.json({ error: 'Format permintaan tidak valid.' }, { status: 400 });
    if (error instanceof BookingError) return Response.json({ error: error.message }, { status: error.status });
    const message = (error as Error).message;
    const known = /^(Rekanan|Kendaraan|Waktu|Pelanggan)/.test(message);
    return Response.json({ error: known ? message : 'Perubahan gagal disimpan. Coba lagi.' }, { status: known ? 409 : 500 });
  }
}
