'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Credenciales inválidas. Verificá tu email y contraseña.')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#062C44]">
      <div className="w-full max-w-sm px-8 py-10 bg-white rounded-xl shadow-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-montserrat font-black text-4xl text-[#062C44]">DATA</span>
          <span className="font-montserrat font-light text-4xl text-[#565556]">CAR</span>
          <p className="text-sm text-gray-500 mt-2 font-inter">Sistema de Dossiers Automotrices</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="font-inter text-sm font-medium text-gray-700">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@datacarpy.com"
              required
              className="font-inter"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="font-inter text-sm font-medium text-gray-700">
              Contraseña
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="font-inter"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 font-inter">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00C7D1] hover:bg-[#00b3bc] text-white font-inter font-semibold"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
