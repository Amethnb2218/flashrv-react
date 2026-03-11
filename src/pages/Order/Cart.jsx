import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FiShoppingCart, FiTrash2, FiMinus, FiPlus, FiArrowLeft, FiShoppingBag } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { readCart, subscribeCart, removeItemFromCart, addItemToCart, clearCart, deriveDeliveryConfigFromItems } from '../../utils/cartStore'
import { useAuth } from '../../context/AuthContext'

const formatPrice = (v) => `${Number(v || 0).toLocaleString('fr-FR')} F`

export default function Cart() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [cart, setCart] = useState(() => readCart())

  useEffect(() => {
    setCart(readCart())
    return subscribeCart(() => setCart(readCart()))
  }, [])

  const items = cart.items || []
  const salon = cart.salon
  const total = items.reduce((s, c) => s + (c.product?.price || 0) * c.quantity, 0)

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/cart' } } })
      return
    }
    const delivery = deriveDeliveryConfigFromItems(items)
    navigate('/order/checkout', {
      state: {
        cart: items,
        salon,
        deliveryMode: delivery.canDeliverAll ? 'DELIVERY' : 'PICKUP',
        deliveryAddress: '',
        clientPhone: user?.phoneNumber || user?.phone || '',
        clientName: user?.name || '',
        notes: '',
        forcePickup: !delivery.canDeliverAll,
        deliveryZones: delivery.deliveryZones,
        minDeliveryFee: delivery.minDeliveryFee,
      },
    })
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-100 flex items-center justify-center">
            <FiShoppingCart className="w-10 h-10 text-primary-400" />
          </div>
          <h2 className="text-xl font-bold text-primary-900 mb-2">Votre panier est vide</h2>
          <p className="text-primary-500 mb-6">Parcourez nos boutiques pour ajouter des articles</p>
          <Link
            to="/salons?businessType=BOUTIQUE"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-900 text-white font-semibold hover:bg-primary-800 transition"
          >
            <FiShoppingBag className="w-5 h-5" />
            Voir les boutiques
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-primary-600 hover:text-primary-900 mb-4 text-sm">
        <FiArrowLeft className="w-4 h-4" /> Retour
      </button>

      <h1 className="text-2xl font-bold text-primary-900 mb-1">Votre panier</h1>
      {salon?.name && <p className="text-sm text-primary-500 mb-5">Boutique : {salon.name}</p>}

      <div className="space-y-3 mb-6">
        {items.map((c, idx) => (
          <motion.div
            key={`${c.product.id}-${c.selectedSize}-${c.selectedColor}-${idx}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 p-4 bg-white border border-primary-100 rounded-2xl shadow-sm"
          >
            {c.product.images?.[0] && (
              <img src={c.product.images[0]} alt={c.product.name} className="w-16 h-16 rounded-xl object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-primary-900 truncate">{c.product.name}</p>
              <div className="flex gap-2 text-xs text-primary-500 mt-0.5">
                {c.selectedSize && <span>Taille {c.selectedSize}</span>}
                {c.selectedColor && <span>Couleur {c.selectedColor}</span>}
              </div>
              <p className="text-sm font-semibold text-gold-600 mt-1">{formatPrice(c.product.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => removeItemFromCart({ productId: c.product.id, selectedSize: c.selectedSize, selectedColor: c.selectedColor })}
                className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center hover:bg-primary-200"
              >
                <FiMinus className="w-4 h-4" />
              </button>
              <span className="font-bold text-sm w-6 text-center">{c.quantity}</span>
              <button
                onClick={() => addItemToCart({ salon, product: c.product, quantity: 1, selectedSize: c.selectedSize, selectedColor: c.selectedColor })}
                className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center hover:bg-gold-200"
              >
                <FiPlus className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-primary-50 rounded-2xl p-4 mb-4">
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-gold-600">{formatPrice(total)}</span>
        </div>
        <p className="text-xs text-primary-500 mt-1">{items.reduce((s, c) => s + c.quantity, 0)} article(s)</p>
      </div>

      <button
        onClick={handleCheckout}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
      >
        Passer la commande ({formatPrice(total)})
      </button>

      <button
        onClick={() => { clearCart(); setCart(readCart()) }}
        className="w-full mt-3 py-2.5 rounded-xl border border-primary-200 text-primary-600 text-sm font-medium hover:bg-primary-50 flex items-center justify-center gap-2"
      >
        <FiTrash2 className="w-4 h-4" /> Vider le panier
      </button>
    </div>
  )
}
