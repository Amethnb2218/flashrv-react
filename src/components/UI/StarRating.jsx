import { FiStar, FiStarFill } from 'react-icons/fi'

function StarRating({ rating, size = 'md', showValue = true }) {
  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  return (
    <div className="flex items-center space-x-1">
      <div className="flex">
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className={`text-yellow-400 ${sizes[size]}`}>★</span>
        ))}
        {hasHalfStar && (
          <span className={`text-yellow-400 ${sizes[size]}`}>★</span>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className={`text-gray-300 ${sizes[size]}`}>★</span>
        ))}
      </div>
      {showValue && (
        <span className="text-sm font-medium text-gray-700 ml-1">{rating.toFixed(1)}</span>
      )}
    </div>
  )
}

export default StarRating

