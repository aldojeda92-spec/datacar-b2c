import './globals.css';
import { Inter, Montserrat } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter',
  weight: ['400', '500', '700'] 
});

const montserrat = Montserrat({ 
  subsets: ['latin'], 
  variable: '--font-montserrat',
  weight: ['300', '900'] 
});

export const metadata = {
  title: 'DATACAR | Inversiones Automotrices',
  description: 'Gestión analítica de inversiones automotrices.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${montserrat.variable} font-inter bg-slate-50 text-data-charcoal`}>
        {children}
      </body>
    </html>
  );
}
