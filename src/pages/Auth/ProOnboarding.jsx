import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const salonTypes = [
  { value: 'coiffure', label: 'Salon de coiffure' },
  { value: 'beaute', label: 'Salon de beauté' },
  { value: 'esthetique', label: 'Esthéticienne' },
  { value: 'autre', label: 'Autre' },
];

export default function ProOnboarding({ onComplete }) {
  const [form, setForm] = useState({
    name: '',
    type: '',
    address: '',
    city: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  // Animation state for form
  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    setShowForm(true);
  }, []);

  // Ne pas supprimer le token ici, sinon l'utilisateur perd l'authentification avant la création du salon

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Nom du salon requis';
    if (!form.type) e.type = 'Type requis';
    if (!form.address.trim()) e.address = 'Adresse requise';
    if (!form.city.trim()) e.city = 'Ville requise';
    if (!form.phone.trim()) e.phone = 'Téléphone requis';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const apiFetch = (await import('../../api/client')).default;
      const res = await apiFetch('/salons', {
        method: 'POST',
        body: {
          name: form.name,
          salonType: form.type,
          address: form.address,
          city: form.city,
          phone: form.phone,
          status: 'PENDING',
        },
      });
      toast.success('Salon enregistré, en attente de validation !');
      if (onComplete) onComplete(res.data.salon);
      navigate('/pro/pending');
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la création du salon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`max-w-md mx-auto py-10 px-6 bg-white rounded-2xl shadow border border-gray-200 transition-all duration-700 ${showForm ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Inscription Pro</h1>
        <p className="text-gray-500 text-sm mt-2">Remplissez les informations pour créer votre espace.</p>
      </div>
      {/* Suppression du bloc d'explication pour un look minimaliste */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block font-medium mb-1 text-gray-700" htmlFor="name">
            Nom du salon <span className="text-primary-500">*</span>
          </label>
          <input id="name" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 outline-none transition placeholder-gray-400 text-base bg-gray-50" placeholder="Ex: Bosh Cut, Beauty Palace..." value={form.name} onChange={e => handleChange('name', e.target.value)} autoComplete="off" />
          {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name}</div>}
        </div>
        <div>
          <label className="block font-medium mb-1 text-gray-700" htmlFor="type">
            Type d'établissement <span className="text-primary-500">*</span>
          </label>
          <select id="type" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 outline-none transition text-base bg-gray-50" value={form.type} onChange={e => handleChange('type', e.target.value)}>
            <option value="">Sélectionner le type</option>
            {salonTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {errors.type && <div className="text-red-500 text-xs mt-1">{errors.type}</div>}
        </div>
        <div>
          <label className="block font-medium mb-1 text-gray-700" htmlFor="address">
            Adresse <span className="text-primary-500">*</span>
          </label>
          <input id="address" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 outline-none transition placeholder-gray-400 text-base bg-gray-50" placeholder="Quartier, rue, point de repère..." value={form.address} onChange={e => handleChange('address', e.target.value)} autoComplete="off" />
          {errors.address && <div className="text-red-500 text-xs mt-1">{errors.address}</div>}
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block font-medium mb-1 text-gray-700" htmlFor="city">
              Ville <span className="text-primary-500">*</span>
            </label>
            <input id="city" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 outline-none transition placeholder-gray-400 text-base bg-gray-50" placeholder="Ex: Dakar, Rufisque..." value={form.city} onChange={e => handleChange('city', e.target.value)} autoComplete="off" />
            {errors.city && <div className="text-red-500 text-xs mt-1">{errors.city}</div>}
          </div>
          <div className="flex-1">
            <label className="block font-medium mb-1 text-gray-700" htmlFor="phone">
              Téléphone <span className="text-primary-500">*</span>
            </label>
            <input id="phone" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 outline-none transition placeholder-gray-400 text-base bg-gray-50" placeholder="Numéro WhatsApp ou mobile" value={form.phone} onChange={e => handleChange('phone', e.target.value)} autoComplete="off" />
            {errors.phone && <div className="text-red-500 text-xs mt-1">{errors.phone}</div>}
          </div>
        </div>
        <button type="submit" className="w-full py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold text-base transition disabled:opacity-60 disabled:cursor-not-allowed" disabled={loading}>
          {loading ? 'Enregistrement...' : 'Créer mon salon'}
        </button>
      </form>
      <div className="mt-6 text-center text-xs text-gray-400">
        Vos données sont sécurisées et privées.
      </div>
    </div>
  );
}
