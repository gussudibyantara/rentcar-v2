export function money(value: number, compact = false) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0, ...(compact && value >= 1000000 ? { notation: 'compact', maximumFractionDigits: 2 } : {}) }).format(value); }
export function dateLabel(date: string, options: Intl.DateTimeFormatOptions = {}) { return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Makassar', ...options }).format(new Date(date)); }
export function todayISO(date = new Date()) { return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Makassar' }).format(date); }
export function initials(name: string) { return name.replace(/^(PT|CV)\s+/,'').split(' ').slice(0,2).map(v => v[0]).join(''); }
export function days(start: string, end: string) { return Math.max(1, Math.ceil((+new Date(end) - +new Date(start)) / 86400000)); }
export function period(start: string, end: string) { return `${dateLabel(start)} – ${dateLabel(end)}`; }
export function paymentStatus(total: number, paid: number) { return paid >= total ? 'Lunas' : paid > 0 ? 'DP' : 'Belum bayar'; }
