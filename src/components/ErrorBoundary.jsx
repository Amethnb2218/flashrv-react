import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-primary-50 p-6">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-primary-900 mb-4">
              Oups, une erreur est survenue
            </h1>
            <p className="text-primary-600 mb-6">
              Veuillez rafraîchir la page ou réessayer plus tard.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition"
            >
              Rafraîchir la page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
