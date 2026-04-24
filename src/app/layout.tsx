import './globals.css';

export const metadata = {
  title: 'Datacar Autogestión',
  description: 'Genera tu dossier de vehículos',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
