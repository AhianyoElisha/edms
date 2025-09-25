class RequestCache {
  private cache = new Map<string, any>()
  private pendingRequests = new Map<string, Promise<any>>()
  private expirationTimes = new Map<string, number>()
  
  // Default cache duration: 5 minutes
  private defaultTTL = 5 * 60 * 1000

  async get<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl: number = this.defaultTTL
  ): Promise<T> {
    // Check if we have a valid cached result
    if (this.isValid(key)) {
      return this.cache.get(key)
    }

    // Check if there's already a pending request for this key
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)
    }

    // Create new request
    const request = fetcher()
      .then((result) => {
        // Store in cache with expiration
        this.cache.set(key, result)
        this.expirationTimes.set(key, Date.now() + ttl)
        this.pendingRequests.delete(key)
        return result
      })
      .catch((error) => {
        // Remove failed request from pending
        this.pendingRequests.delete(key)
        throw error
      })

    // Store pending request
    this.pendingRequests.set(key, request)
    return request
  }

  private isValid(key: string): boolean {
    if (!this.cache.has(key)) return false
    const expiration = this.expirationTimes.get(key)
    if (!expiration || Date.now() > expiration) {
      this.invalidate(key)
      return false
    }
    return true
  }

  invalidate(key: string): void {
    this.cache.delete(key)
    this.expirationTimes.delete(key)
    this.pendingRequests.delete(key)
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern)
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.invalidate(key)
      }
    }
  }

  clear(): void {
    this.cache.clear()
    this.expirationTimes.clear()
    this.pendingRequests.clear()
  }

  // Get cache stats for debugging
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

export const requestCache = new RequestCache()
