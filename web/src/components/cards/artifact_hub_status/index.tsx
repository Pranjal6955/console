import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Database,
  Package,
  RefreshCw,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '../../ui/Skeleton'
import { MetricTile } from '../../../lib/cards/CardComponents'
import { useArtifactHubStatus } from './useArtifactHubStatus'

function useFormatRelativeTime() {
  const { t } = useTranslation('cards')
  return (isoString: string): string => {
    const diff = Date.now() - new Date(isoString).getTime()
    if (isNaN(diff) || diff < 0) return t('artifactHub.syncedJustNow')
    const minute = 60_000
    const hour = 60 * minute
    const day = 24 * hour
    if (diff < minute) return t('artifactHub.syncedJustNow')
    if (diff < hour) return t('artifactHub.syncedMinutesAgo', { count: Math.floor(diff / minute) })
    if (diff < day) return t('artifactHub.syncedHoursAgo', { count: Math.floor(diff / hour) })
    return t('artifactHub.syncedDaysAgo', { count: Math.floor(diff / day) })
  }
}

export function ArtifactHubStatus() {
  const { t } = useTranslation('cards')
  const formatRelativeTime = useFormatRelativeTime()
  const { data, error, showSkeleton, showEmptyState } = useArtifactHubStatus()

  if (showSkeleton) {
    return (
      <div className="h-full flex flex-col min-h-card gap-3">
        <Skeleton variant="rounded" height={36} />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton variant="rounded" height={80} className="flex-1" />
          <Skeleton variant="rounded" height={80} className="flex-1" />
          <Skeleton variant="rounded" height={80} className="flex-1" />
          <Skeleton variant="rounded" height={80} className="flex-1" />
        </div>
        <Skeleton variant="rounded" height={40} />
      </div>
    )
  }

  if (error || showEmptyState) {
    return (
      <div className="h-full flex flex-col items-center justify-center min-h-card text-muted-foreground gap-2">
        <AlertTriangle className="w-6 h-6 text-red-400" />
        <p className="text-sm text-red-400">
          {error ? t('artifactHub.fetchError') : t('artifactHub.noData')}
        </p>
        <p className="text-xs">{t('artifactHub.noDataHint')}</p>
      </div>
    )
  }

  const isHealthy = data.health === 'healthy'

  return (
    <div className="h-full flex flex-col min-h-card content-loaded gap-4">
      <div className="flex items-center justify-between">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            isHealthy
              ? 'bg-green-500/15 text-green-400'
              : 'bg-orange-500/15 text-orange-400'
          }`}
        >
          {isHealthy ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          {isHealthy ? t('artifactHub.healthy') : t('artifactHub.degraded')}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <RefreshCw className="w-3 h-3" />
          <span>{formatRelativeTime(data.lastCheckTime)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricTile
          label={t('artifactHub.packages')}
          value={data.packages.toLocaleString()}
          colorClass="text-blue-400"
          icon={<Package className="w-4 h-4 text-blue-400" />}
        />
        <MetricTile
          label={t('artifactHub.repositories')}
          value={data.repositories.toLocaleString()}
          colorClass="text-purple-400"
          icon={<Database className="w-4 h-4 text-purple-400" />}
        />
        <MetricTile
          label={t('artifactHub.organizations')}
          value={data.organizations.toLocaleString()}
          colorClass="text-teal-400"
          icon={<Building2 className="w-4 h-4 text-teal-400" />}
        />
        <MetricTile
          label={t('artifactHub.users')}
          value={data.users.toLocaleString()}
          colorClass="text-orange-400"
          icon={<Users className="w-4 h-4 text-orange-400" />}
        />
      </div>

      <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground">
        <a
          href="https://artifacthub.io"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-blue-400 transition-colors"
        >
          {t('artifactHub.openArtifactHub')}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>
    </div>
  )
}

export default ArtifactHubStatus
