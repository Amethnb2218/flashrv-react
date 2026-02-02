import { FiCheck } from 'react-icons/fi'

function BookingSteps({ currentStep, steps }) {
  return (
    <div className="flex items-center justify-center space-x-2 md:space-x-4">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex items-center">
            <div className={`
              w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-semibold text-sm
              transition-all duration-300
              ${currentStep > index + 1
                ? 'bg-green-500 text-white'
                : currentStep === index + 1
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                  : 'bg-gray-200 text-gray-500'
              }
            `}>
              {currentStep > index + 1 ? (
                <FiCheck className="w-5 h-5" />
              ) : (
                index + 1
              )}
            </div>
            <span className={`
              hidden md:block ml-2 font-medium text-sm
              ${currentStep === index + 1 ? 'text-primary-600' : 'text-gray-500'}
            `}>
              {step.name}
            </span>
          </div>
          
          {index < steps.length - 1 && (
            <div className={`
              w-8 md:w-16 h-1 mx-2 rounded-full
              ${currentStep > index + 1 ? 'bg-green-500' : 'bg-gray-200'}
            `} />
          )}
        </div>
      ))}
    </div>
  )
}

export default BookingSteps

