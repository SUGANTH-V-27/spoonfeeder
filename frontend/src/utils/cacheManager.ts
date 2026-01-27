interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: number; // For invalidation tracking
}

interface CacheMetadata {
  lastUpdated: number;
  version: number;
}

class SmartCacheManager {
  private static instance: SmartCacheManager;
  private cacheVersions: Map<string, number> = new Map();
  private metadataKey = 'cache_metadata';

  static getInstance(): SmartCacheManager {
    if (!SmartCacheManager.instance) {
      SmartCacheManager.instance = new SmartCacheManager();
    }
    return SmartCacheManager.instance;
  }

  private constructor() {
    this.loadMetadata();
  }

  private loadMetadata() {
    try {
      const metadata = localStorage.getItem(this.metadataKey);
      if (metadata) {
        const parsed: Record<string, CacheMetadata> = JSON.parse(metadata);
        Object.entries(parsed).forEach(([key, value]) => {
          this.cacheVersions.set(key, value.version);
        });
      }
    } catch (error) {
      console.warn('Failed to load cache metadata:', error);
    }
  }

  private saveMetadata() {
    try {
      const metadata: Record<string, CacheMetadata> = {};
      this.cacheVersions.forEach((version, key) => {
        metadata[key] = {
          lastUpdated: Date.now(),
          version
        };
      });
      localStorage.setItem(this.metadataKey, JSON.stringify(metadata));
    } catch (error) {
      console.warn('Failed to save cache metadata:', error);
    }
  }

  // Get cached data with version checking
  get<T>(key: string): T | null {
    try {
      const cached = sessionStorage.getItem(key);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const currentVersion = this.cacheVersions.get(key) || 0;

      // Check if cache is still valid
      if (entry.version !== currentVersion) {
        // Cache is outdated, remove it
        sessionStorage.removeItem(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn(`Failed to get cache for key ${key}:`, error);
      return null;
    }
  }

  // Set cached data with current version
  set<T>(key: string, data: T): void {
    try {
      const currentVersion = this.cacheVersions.get(key) || 0;
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        version: currentVersion
      };

      sessionStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.warn(`Failed to set cache for key ${key}:`, error);
    }
  }

  // Invalidate specific cache entry (called when admin updates something)
  invalidate(key: string): void {
    try {
      sessionStorage.removeItem(key);
      // Increment version for this key to invalidate all future cached entries
      const currentVersion = this.cacheVersions.get(key) || 0;
      this.cacheVersions.set(key, currentVersion + 1);
      this.saveMetadata();
      console.log(`Cache invalidated for key: ${key}`);
    } catch (error) {
      console.warn(`Failed to invalidate cache for key ${key}:`, error);
    }
  }

  // Invalidate all cache entries for a pattern (e.g., all topics for a course)
  invalidatePattern(pattern: string): void {
    try {
      const keysToRemove: string[] = [];

      // Find all keys matching the pattern
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.includes(pattern)) {
          keysToRemove.push(key);
          // Increment version for this key pattern
          const currentVersion = this.cacheVersions.get(key) || 0;
          this.cacheVersions.set(key, currentVersion + 1);
        }
      }

      // Remove matching keys
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
      this.saveMetadata();

      console.log(`Cache invalidated for pattern: ${pattern}, removed ${keysToRemove.length} entries`);
    } catch (error) {
      console.warn(`Failed to invalidate cache pattern ${pattern}:`, error);
    }
  }

  // Clear all cache
  clearAll(): void {
    try {
      // Clear all cache-related sessionStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('content_cache_') ||
                    key.startsWith('topics_cache_') ||
                    key.startsWith('subtopics_cache_') ||
                    key.startsWith('courses_cache_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));

      // Reset versions
      this.cacheVersions.clear();
      localStorage.removeItem(this.metadataKey);

      console.log(`Cleared all cache: ${keysToRemove.length} entries`);
    } catch (error) {
      console.warn('Failed to clear all cache:', error);
    }
  }

  // Get cache statistics
  getStats() {
    const stats = {
      versions: Object.fromEntries(this.cacheVersions),
      sessionStorageKeys: 0,
      cacheKeys: 0
    };

    try {
      stats.sessionStorageKeys = sessionStorage.length;
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('content_cache_') ||
                    key.startsWith('topics_cache_') ||
                    key.startsWith('subtopics_cache_') ||
                    key.startsWith('courses_cache_'))) {
          stats.cacheKeys++;
        }
      }
    } catch (error) {
      // Ignore errors in stats
    }

    return stats;
  }
}

// Export singleton instance
export const cacheManager = SmartCacheManager.getInstance();

// Helper functions for common cache operations
export const getCachedData = <T>(key: string): T | null => cacheManager.get<T>(key);
export const setCachedData = <T>(key: string, data: T): void => cacheManager.set<T>(key, data);
export const invalidateCache = (key: string): void => cacheManager.invalidate(key);
export const invalidateCachePattern = (pattern: string): void => cacheManager.invalidatePattern(pattern);
export const clearAllCache = (): void => cacheManager.clearAll();
export const getCacheStats = () => cacheManager.getStats();