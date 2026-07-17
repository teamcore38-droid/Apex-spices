import { Component } from 'react'
import RouteLoadingScreen from './RouteLoadingScreen'
import { isChunkLoadError, recoverFromChunkLoadError } from '../utils/chunkLoadRecovery'

class RouteErrorBoundary extends Component {
  state = {
    error: null,
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    recoverFromChunkLoadError(error)
  }

  componentDidUpdate(previousProps) {
    if (previousProps.locationKey !== this.props.locationKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    const { error } = this.state

    if (!error) {
      return this.props.children
    }

    if (isChunkLoadError(error)) {
      return <RouteLoadingScreen />
    }

    return (
      <div className="flex min-h-[55vh] items-center justify-center bg-[#f7f9fc] px-4">
        <div className="w-full max-w-md rounded-[28px] border border-[#dce4ef] bg-white px-8 py-10 text-center shadow-[0_18px_40px_rgba(11,31,58,0.08)]">
          <p className="text-xs font-bold uppercase tracking-[0.34em] text-brand-accent">Apex Spices</p>
          <h1 className="mt-4 font-serif text-2xl font-bold text-brand-dark">This page needs a quick refresh</h1>
          <p className="mt-3 text-sm leading-7 text-gray-500">
            We could not finish loading this page. Refresh to continue with the latest storefront.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full bg-brand-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.22em] text-white transition hover:bg-brand-dark"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }
}

export default RouteErrorBoundary
