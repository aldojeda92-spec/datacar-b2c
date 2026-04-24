'use client'

export default function DossierError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="max-w-2xl mx-auto mt-16 p-6 bg-red-50 border border-red-200 rounded-xl space-y-4">
      <h2 className="font-inter font-bold text-red-700 text-lg">Error al cargar el dossier</h2>
      <p className="font-inter text-sm text-red-600 font-mono bg-red-100 p-3 rounded break-all">
        {error.message || 'Error desconocido'}
      </p>
      {error.digest && (
        <p className="font-inter text-xs text-red-400">ID: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="bg-red-600 text-white px-4 py-2 rounded font-inter text-sm hover:bg-red-700"
      >
        Reintentar
      </button>
    </div>
  )
}
