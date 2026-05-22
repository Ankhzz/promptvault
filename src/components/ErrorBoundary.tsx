'use client'

import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-destructive text-sm font-medium">Something went wrong</p>
          <p className="text-subtle text-xs mt-1 mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button variant="outline" size="sm" onClick={() => this.setState({ hasError: false, error: undefined })}>
            Try again
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}