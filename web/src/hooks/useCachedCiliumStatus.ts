import { useCache, type RefreshCategory } from '../lib/cache'
import { fetchCiliumStatus } from './useCachedData/agentFetchers'
import { getDemoCiliumStatus } from './useCachedData/demoData'

export interface CiliumNode {
    name: string
    status: 'Healthy' | 'Degraded' | 'Unhealthy'
    version: string
}

export interface CiliumStatus {
    status: 'Healthy' | 'Degraded' | 'Unhealthy'
    nodes: CiliumNode[]
    networkPolicies: number
    endpoints: number
    hubble: {
        enabled: boolean
        flowsPerSecond: number
        metrics: {
            forwarded: number
            dropped: number
        }
    }
}

const CACHE_KEY_CILIUM = 'cilium_status'

export interface CachedHookResult<T> {
    data: T
    isLoading: boolean
    isRefreshing: boolean
    isDemoData: boolean
    isFailed: boolean
    consecutiveFailures: number
    lastRefresh: number | null
    refetch: () => Promise<void>
}

export function useCachedCiliumStatus(): CachedHookResult<CiliumStatus> {
    const result = useCache({
        key: CACHE_KEY_CILIUM,
        category: 'default' as RefreshCategory,
        initialData: {
            status: 'Healthy',
            nodes: [],
            networkPolicies: 0,
            endpoints: 0,
            hubble: {
                enabled: false,
                flowsPerSecond: 0,
                metrics: { forwarded: 0, dropped: 0 }
            }
        } as CiliumStatus,
        demoData: getDemoCiliumStatus(),
        fetcher: fetchCiliumStatus,
    })

    // Rule 2: Never use demo data during loading.
    // The hook's isDemoFallback must be false while isLoading is true.
    const isDemoData = result.isDemoFallback && !result.isLoading

    return {
        data: result.data,
        isLoading: result.isLoading,
        isRefreshing: result.isRefreshing,
        isDemoData,
        isFailed: result.isFailed,
        consecutiveFailures: result.consecutiveFailures,
        lastRefresh: result.lastRefresh,
        refetch: result.refetch,
    }
}
