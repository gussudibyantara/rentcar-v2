import type { Metadata } from 'next';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './globals.css';
export const metadata:Metadata={title:'TravelOS — Dashboard Rental',description:'Kelola rental, kendaraan, dan aktivitas harian dalam satu dashboard.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="id"><body>{children}</body></html>;}