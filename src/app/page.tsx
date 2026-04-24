import Link from 'next/link'
import { FilePlus, History, BookOpen } from 'lucide-react'
import DossiersTable from '@/components/historial/DossiersTable'
import AnalyticsCards from '@/components/dashboard/AnalyticsCards'

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-inter font-bold text-[#1A1A1A]">Bienvenido a DATACAR</h2>
        <p className="text-[#6B7280] font-inter mt-1">¿Qué querés hacer hoy?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/nuevo-dossier" className="bg-[#00C7D1] text-white rounded-lg p-6 flex flex-col gap-3 hover:opacity-90 transition-opacity">
          <FilePlus size={28} />
          <div>
            <p className="font-inter font-bold text-lg">Nuevo Dossier</p>
            <p className="text-sm text-white/80 font-inter">Generar análisis para un cliente</p>
          </div>
        </Link>

        <Link href="/historial" className="bg-white border border-[#EAEAEA] rounded-lg p-6 flex flex-col gap-3 hover:border-[#00C7D1] transition-colors">
          <History size={28} className="text-[#062C44]" />
          <div>
            <p className="font-inter font-bold text-lg text-[#1A1A1A]">Historial</p>
            <p className="text-sm text-[#6B7280] font-inter">Ver dossiers anteriores</p>
          </div>
        </Link>

        <Link href="/catalogo" className="bg-white border border-[#EAEAEA] rounded-lg p-6 flex flex-col gap-3 hover:border-[#00C7D1] transition-colors">
          <BookOpen size={28} className="text-[#062C44]" />
          <div>
            <p className="font-inter font-bold text-lg text-[#1A1A1A]">Catálogo</p>
            <p className="text-sm text-[#6B7280] font-inter">392 vehículos activos</p>
          </div>
        </Link>
      </div>

      <AnalyticsCards />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-inter font-semibold text-[#1A1A1A]">Últimos dossiers</h3>
          <Link href="/historial" className="text-sm text-[#00C7D1] font-inter hover:underline">Ver todos →</Link>
        </div>
        <DossiersTable limit={5} />
      </div>
    </div>
  )
}
