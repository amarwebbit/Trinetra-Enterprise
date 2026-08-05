'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseDataFetchingOptions<T> {
  onError?: (error: Error) => void;
  initialData?: T | null;
}

export function useDataFetching<T>(
  fetcher: () => Promise<T>,
  options: UseDataFetchingOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(options.initialData ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('An error occurred');
      setIsError(true);
      setError(errorObj);
      options.onError?.(errorObj);
    } finally {
      setIsLoading(false);
    }
  }, [fetcher, options]);

  useEffect(() => {
    fetchData();
  }, []);

  return { data, isLoading, isError, error, refetch: fetchData };
}
