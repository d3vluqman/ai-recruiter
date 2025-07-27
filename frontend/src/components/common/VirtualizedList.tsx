import React, { useState, useEffect, useRef, useCallback } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  loadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  className?: string;
  overscan?: number; // Number of items to render outside visible area
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  loadMore,
  hasMore = false,
  loading = false,
  className = '',
  overscan = 5,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollTop(scrollTop);

    // Load more items when near the bottom
    if (
      loadMore &&
      hasMore &&
      !loading &&
      scrollTop + containerHeight >= totalHeight - itemHeight * 3
    ) {
      loadMore();
    }
  }, [loadMore, hasMore, loading, totalHeight, containerHeight, itemHeight]);

  // Auto-scroll to maintain position when items are added
  useEffect(() => {
    if (containerRef.current && items.length > 0) {
      const container = containerRef.current;
      const shouldMaintainPosition = container.scrollTop > 0;
      
      if (shouldMaintainPosition) {
        // Maintain scroll position when new items are added
        const newScrollTop = Math.min(
          container.scrollTop,
          totalHeight - containerHeight
        );
        container.scrollTop = newScrollTop;
      }
    }
  }, [items.length, totalHeight, containerHeight]);

  return (
    <div
      ref={containerRef}
      className={`virtualized-list ${className}`}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{
                height: itemHeight,
                overflow: 'hidden',
              }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
      
      {loading && (
        <div className="virtualized-list-loading">
          <div className="loading-spinner">Loading more items...</div>
        </div>
      )}
    </div>
  );
}

// Hook for managing virtualized list state with pagination
export function useVirtualizedList<T>(
  fetchItems: (page: number, limit: number) => Promise<{
    items: T[];
    total: number;
    hasMore: boolean;
  }>,
  itemsPerPage: number = 50
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async (pageNum: number, append: boolean = false) => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchItems(pageNum, itemsPerPage);
      
      setItems(prev => append ? [...prev, ...result.items] : result.items);
      setTotal(result.total);
      setHasMore(result.hasMore);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [fetchItems, itemsPerPage, loading]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadItems(page + 1, true);
    }
  }, [hasMore, loading, page, loadItems]);

  const refresh = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    loadItems(1, false);
  }, [loadItems]);

  // Initial load
  useEffect(() => {
    loadItems(1, false);
  }, []);

  return {
    items,
    loading,
    hasMore,
    total,
    error,
    loadMore,
    refresh,
  };
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  callback: () => void,
  options: IntersectionObserverInit = {}
) {
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callback();
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
        ...options,
      }
    );

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [callback, options]);

  return targetRef;
}

// Lazy loading wrapper component
interface LazyLoadProps {
  children: React.ReactNode;
  onLoad: () => void;
  height?: number;
  className?: string;
}

export const LazyLoad: React.FC<LazyLoadProps> = ({
  children,
  onLoad,
  height = 200,
  className = '',
}) => {
  const [loaded, setLoaded] = useState(false);
  const targetRef = useIntersectionObserver(() => {
    if (!loaded) {
      setLoaded(true);
      onLoad();
    }
  });

  return (
    <div
      ref={targetRef}
      className={`lazy-load ${className}`}
      style={{ minHeight: height }}
    >
      {loaded ? children : <div className="lazy-load-placeholder">Loading...</div>}
    </div>
  );
};