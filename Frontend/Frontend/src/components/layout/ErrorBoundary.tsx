import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] Caught render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="m-6 p-6 bg-red-50 border border-red-300 rounded-lg text-red-800">
          <h2 className="font-bold mb-2">Something went wrong rendering this screen</h2>
          <p className="text-sm mb-4">{this.state.error.message}</p>
          <button
            onClick={() => {
              this.setState({ error: null })
              window.location.reload()
            }}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
