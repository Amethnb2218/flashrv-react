import { useState } from 'react'
import { FiUserPlus, FiCheck, FiAlertCircle } from 'react-icons/fi'

export default function AddAdminForm({ onAdminAdded }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setIsSuccess(false)
    try {
      const token = localStorage.getItem('flashrv_token') || ''
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/admin/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage('Administrateur ajouté avec succès !')
        setIsSuccess(true)
        setEmail('')
        if (onAdminAdded) onAdminAdded()
      } else {
        setMessage(data.message || "Erreur lors de l'ajout")
        setIsSuccess(false)
      }
    } catch (err) {
      setMessage('Erreur réseau')
      setIsSuccess(false)
    }
    setLoading(false)
  }

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-4">
      <h3 className="text-sm font-semibold text-indigo-800 mb-3 flex items-center gap-2">
        <FiUserPlus className="w-4 h-4" />
        Ajouter un administrateur
      </h3>
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
        <input
          type="email"
          required
          placeholder="Email de l'utilisateur à promouvoir"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="flex-1 border border-indigo-200 bg-white text-slate-800 placeholder:text-slate-400 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 text-sm transition"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition whitespace-nowrap"
        >
          <FiUserPlus className="w-4 h-4" />
          {loading ? 'Ajout...' : 'Promouvoir'}
        </button>
      </form>
      {message && (
        <div className={`mt-3 flex items-center gap-2 text-sm font-medium ${isSuccess ? 'text-emerald-600' : 'text-rose-600'}`}>
          {isSuccess ? <FiCheck className="w-4 h-4" /> : <FiAlertCircle className="w-4 h-4" />}
          {message}
        </div>
      )}
    </div>
  )
}
