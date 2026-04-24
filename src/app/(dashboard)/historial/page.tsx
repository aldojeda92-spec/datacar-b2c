import DossiersTable from '@/components/historial/DossiersTable'

export default function HistorialPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-inter font-bold text-[#1A1A1A]">Historial de Dossiers</h2>
        <p className="text-[#6B7280] font-inter text-sm">Todos tus dossiers generados</p>
      </div>
      <DossiersTable />
    </div>
  )
}
