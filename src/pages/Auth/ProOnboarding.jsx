import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiShoppingBag, FiScissors } from 'react-icons/fi';
import QuartierSelector from '../../components/UI/QuartierSelector';

const salonTypes = [
  { value: 'coiffure', label: 'Salon de coiffure' },
  { value: 'beaute', label: 'Salon de beauté' },
  { value: 'esthetique', label: 'Esthéticienne' },
  { value: 'autre', label: 'Autre' },
];

const boutiqueTypes = [
  { value: 'accessoires', label: 'Accessoires' },
  { value: 'vetements', label: 'Vêtements' },
  { value: 'sacs', label: 'Sacs & Maroquinerie' },
  { value: 'cosmetiques', label: 'Cosmétiques & Beauté' },
  { value: 'chaussures', label: 'Chaussures' },
  { value: 'bijoux', label: 'Bijoux & Montres' },
  { value: 'electronique', label: 'Électronique' },
  { value: 'alimentation', label: 'Alimentation' },
  { value: 'autre', label: 'Autre' },
];

export default function ProOnboarding({ onComplete }) {
  const [businessType, setBusinessType] = useState(null); // null = choosing, 'SALON' or 'BOUTIQUE'
  const [form, setForm] = useState({
    name: '',
    type: '',
    neighborhood: '',
    address: '',
    city: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    setShowForm(true);
  }, []);

  const isBoutique = businessType === 'BOUTIQUE';
  const typeOptions = isBoutique ? boutiqueTypes : salonTypes;

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = isBoutique ? 'Nom de la boutique requis' : 'Nom du salon requis';
    if (!form.type) e.type = 'Type requis';
    if (!form.address.trim()) e.address = 'Adresse requise';
    if (!form.neighborhood) e.neighborhood = 'Quartier requis';
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
          businessType,
          neighborhood: form.neighborhood,
          address: form.address,
          city: form.city,
          phone: form.phone,
          status: 'PENDING',
        },
      });
      toast.success(isBoutique
        ? 'Boutique enregistrée, en attente de validation !'
        : 'Salon enregistré, en attente de validation !'
      );
      if (onComplete) onComplete(res.data.salon);
      navigate('/pro/pending');
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Choose business type
  if (!businessType) {
    return (
      <div className={`max-w-lg mx-auto py-10 px-6 bg-white rounded-2xl shadow border border-gray-200 transition-all duration-700 ${showForm ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Inscription Pro</h1>
          <p className="text-gray-500 text-sm mt-2">Quel type d'espace souhaitez-vous créer ?</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => { setBusinessType('SALON'); setForm(f => ({ ...f, type: '' })); }}
            className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition">
              <FiScissors className="text-primary-600 text-2xl" />
            </div>
            <span className="font-semibold text-gray-800 text-lg">Salon</span>
            <span className="text-xs text-gray-500 text-center">Coiffure, beauté, esthétique — Réservations & services</span>
          </button>
          <button
            onClick={() => { setBusinessType('BOUTIQUE'); setForm(f => ({ ...f, type: '' })); }}
            className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-gray-200 hover:border-amber-500 hover:bg-amber-50 transition cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition">
              <FiShoppingBag className="text-amber-600 text-2xl" />
            </div>
            <span className="font-semibold text-gray-800 text-lg">Boutique</span>
            <span className="text-xs text-gray-500 text-center">Vente de produits — Commandes & articles</span>
          </button>
        </div>
        <div className="mt-6 text-center text-xs text-gray-400">
          Vous pourrez personnaliser votre espace après validation.
        </div>
      </div>
    );
  }

  // Step 2: Fill form
  return (
    <div className={`max-w-md mx-auto py-10 px-6 bg-white rounded-2xl shadow border border-gray-200 transition-all duration-700 ${showForm ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {isBoutique ? 'Créer ma boutique' : 'Créer mon salon'}
        </h1>
        <p className="text-gray-500 text-sm mt-2">Remplissez les informations pour créer votre espace.</p>
        <button
          type="button"
          onClick={() => setBusinessType(null)}
          className="mt-2 text-xs text-primary-500 hover:underline"
        >
          ← Changer de type
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block font-medium mb-1 text-gray-700" htmlFor="name">
            {isBoutique ? 'Nom de la boutique' : 'Nom du salon'} <span className="text-primary-500">*</span>
          </label>
          <input id="name" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 outline-none transition placeholder-gray-400 text-base bg-gray-50" placeholder={isBoutique ? 'Ex: Fashion Store, Dakar Bags...' : 'Ex: Bosh Cut, Beauty Palace...'} value={form.name} onChange={e => handleChange('name', e.target.value)} autoComplete="off" />
          {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name}</div>}
        </div>
        <div>
          <label className="block font-medium mb-1 text-gray-700" htmlFor="type">
            {isBoutique ? 'Type de boutique' : "Type d'établissement"} <span className="text-primary-500">*</span>
          </label>
          <select id="type" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 outline-none transition text-base bg-gray-50" value={form.type} onChange={e => handleChange('type', e.target.value)}>
            <option value="">Sélectionner le type</option>
            {typeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {errors.type && <div className="text-red-500 text-xs mt-1">{errors.type}</div>}
        </div>
        <div>
          <label className="block font-medium mb-1 text-gray-700" htmlFor="address">
            Adresse <span className="text-primary-500">*</span>
          </label>
          <input id="address" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 outline-none transition placeholder-gray-400 text-base bg-gray-50" placeholder="Rue, point de repère..." value={form.address} onChange={e => handleChange('address', e.target.value)} autoComplete="off" />
          {errors.address && <div className="text-red-500 text-xs mt-1">{errors.address}</div>}
        </div>
        <div>
          <label className="block font-medium mb-1 text-gray-700">
            Quartier <span className="text-primary-500">*</span>
          </label>
          <QuartierSelector
            value={form.neighborhood}
            onChange={(v) => handleChange('neighborhood', v)}
            placeholder="Sélectionner votre quartier"
            variant="form"
          />
          {errors.neighborhood && <div className="text-red-500 text-xs mt-1">{errors.neighborhood}</div>}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
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
        <button type="submit" className={`w-full py-2 rounded-lg ${isBoutique ? 'bg-amber-600 hover:bg-amber-700' : 'bg-primary-600 hover:bg-primary-700'} text-white font-semibold text-base transition disabled:opacity-60 disabled:cursor-not-allowed`} disabled={loading}>
          {loading ? 'Enregistrement...' : isBoutique ? 'Créer ma boutique' : 'Créer mon salon'}
        </button>
      </form>
      <div className="mt-6 text-center text-xs text-gray-400">
        Vos données sont sécurisées et privées.
      </div>
    </div>
  );
}
