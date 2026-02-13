import { useState } from 'react'

export default function AddAdminForm({ onAdminAdded }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleAdd = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/admin/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage('Admin ajouté avec succès')
        setEmail('')
        if (onAdminAdded) onAdminAdded()
      } else {
        setMessage(data.message || 'Erreur lors de l\'ajout')
      }
    } catch (e) {
      setMessage('Erreur réseau')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-2 items-start md:items-end mb-4">
      <input
        type="email"
        required
        placeholder="Email de l'utilisateur à promouvoir"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="border border-blue-800 bg-blue-900/80 text-blue-100 placeholder:text-blue-300 px-3 py-2 rounded-lg focus:bg-blue-900/90 focus:text-blue-100 focus:border-blue-700 transition-colors duration-200"
      />
      <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold">
        {loading ? 'Ajout...' : 'Ajouter Admin'}
      </button>
      {message && <span className="ml-2 text-sm text-gray-200 font-poppins">{message}</span>}
    </form>
  )
}
