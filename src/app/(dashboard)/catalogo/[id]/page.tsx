import { db } from '@/lib/db'
import { vehiculos } from '@/../drizzle/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import VehiculoForm from '@/components/catalogo/VehiculoForm'
import type { Vehiculo } from '@/types'

export default async function EditarVehiculoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [vehiculo] = await db.select().from(vehiculos).where(eq(vehiculos.id, id)).limit(1)
  if (!vehiculo) notFound()

  return (
    <div>
      <h2 className="text-xl font-inter font-bold text-[#1A1A1A] mb-6">
        Editar — {vehiculo.marca} {vehiculo.modelo} {vehiculo.version}
      </h2>
      <VehiculoForm vehiculo={vehiculo as unknown as Vehiculo} />
    </div>
  )
}
