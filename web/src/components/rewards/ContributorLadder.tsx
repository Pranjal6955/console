/**
 * ContributorLadder — shows current level, progress to next, and the full ladder
 */

import { useState } from 'react'
import {
  Telescope, Compass, Map, Rocket, Shield, Star, Crown, Sparkles,
  Coins, ChevronDown, ChevronUp, Copy, Check,
} from 'lucide-react'
import { Linkedin } from '@/lib/icons'
import { useRewards } from '../../hooks/useRewards'
import { useAuth } from '../../lib/auth'
import { getContributorLevel, CONTRIBUTOR_LEVELS } from '../../types/rewards'
import { emitLinkedInShare } from '../../lib/analytics'
import type { ContributorLevel } from '../../types/rewards'

const LEVEL_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Telescope,
  Compass,
  Map,
  Rocket,
  Shield,
  Star,
  Crown,
  Sparkles,
}

function LevelIcon({ level, className }: { level: ContributorLevel; className?: string }) {
  const Icon = LEVEL_ICONS[level.icon] || Star
  return <Icon className={className} />
}

/** Compact banner showing coins + level for the top of the Updates tab */
export function ContributorBanner() {
  const { totalCoins, githubPoints } = useRewards()
  const { user } = useAuth()
  const { current, next, progress, coinsToNext } = getContributorLevel(totalCoins)
  const [showLadder, setShowLadder] = useState(false)
  const [showBadgeInfo, setShowBadgeInfo] = useState(false)
  const [copied, setCopied] = useState(false)

  const githubLogin = user?.github_login || 'demo-user'
  // Use window.location.origin for the absolute URL to ensure GitHub can proxy it
  const badgeUrl = `${window.location.origin}/api/badge/${githubLogin}`
  const profileUrl = `${window.location.origin}/arcade`
  const markdown = `[![KubeStellar Rank](${badgeUrl})](${profileUrl})`

  const handleLinkedInShare = () => {
    const text = `I'm a Level ${current.rank} "${current.name}" contributor on the KubeStellar Console with ${totalCoins.toLocaleString()} coins! Join the open-source KubeStellar project and start your contributor journey.`
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://kubestellar.io')}&summary=${encodeURIComponent(text)}`
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer,width=600,height=600')
    emitLinkedInShare('contributor_ladder')
  }

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAddToGitHub = () => {
    const editUrl = `https://github.com/${githubLogin}/${githubLogin}/edit/main/README.md`
    window.open(editUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="border-b border-border/50">
      {/* Main banner */}
      <div className="px-3 py-2.5">
        {/* Top row: coins + level badge + share */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-yellow-500" />
              <span className="text-lg font-bold text-yellow-400">{totalCoins.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">coins</span>
            </div>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${current.bgClass} ${current.borderClass}`}>
              <LevelIcon level={current} className={`w-3 h-3 ${current.textClass}`} />
              <span className={`text-2xs font-semibold uppercase tracking-wider ${current.textClass}`}>
                {current.name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setShowBadgeInfo(!showBadgeInfo); setShowLadder(false) }}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter transition-colors border ${showBadgeInfo ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-secondary/30 text-muted-foreground border-transparent hover:border-border hover:text-foreground'}`}
              title="GitHub Rank Badge"
            >
              Badge
            </button>
            {totalCoins > 0 && (
              <button
                onClick={handleLinkedInShare}
                className="p-1 rounded hover:bg-secondary/50 text-muted-foreground hover:text-[#0A66C2] transition-colors"
                title={`Share your ${current.name} status on LinkedIn`}
              >
                <Linkedin className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => { setShowLadder(!showLadder); setShowBadgeInfo(false) }}
              className={`flex items-center gap-1 text-2xs transition-colors ${showLadder ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {showLadder ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Levels
            </button>
          </div>
        </div>

        {/* Progress bar to next level */}
        {next ? (
          <div>
            <div className="flex items-center justify-between text-2xs text-muted-foreground mb-1">
              <span className={current.textClass}>{current.name}</span>
              <span>{coinsToNext.toLocaleString()} coins to {next.name}</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${current.color === 'gray' ? 'bg-gray-400' :
                  current.color === 'blue' ? 'bg-blue-400' :
                    current.color === 'cyan' ? 'bg-cyan-400' :
                      current.color === 'green' ? 'bg-green-400' :
                        current.color === 'purple' ? 'bg-purple-400' :
                          current.color === 'yellow' ? 'bg-yellow-400' :
                            current.color === 'orange' ? 'bg-orange-400' :
                              current.color === 'red' ? 'bg-red-400' :
                                'bg-yellow-400'
                  }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-2xs text-yellow-400 text-center">
            Max level reached!
          </div>
        )}

        {githubPoints > 0 && (
          <p className="text-2xs text-muted-foreground mt-1">
            Includes {githubPoints.toLocaleString()} from GitHub contributions
          </p>
        )}
      </div>

      {/* Badge integration helper */}
      {showBadgeInfo && (
        <div className="px-4 pb-4 pt-2 border-t border-purple-500/20 bg-gradient-to-b from-purple-500/5 to-transparent animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-3 bg-purple-500 rounded-full" />
              <span className="text-xs font-bold text-foreground">GitHub Integration</span>
            </div>
            <button
              onClick={() => setShowBadgeInfo(false)}
              className="p-1 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Step 1: Preview & Copy */}
            <div className="relative p-3 rounded-xl bg-background/40 border border-border/50 backdrop-blur-sm shadow-inner group">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] font-bold text-purple-400 shrink-0 border border-purple-500/30">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-semibold text-foreground block mb-2">Copy Badge Snippet</span>

                  <div className="flex items-center justify-center py-4 mb-3 rounded-lg bg-black/20 border border-white/5 shadow-lg group-hover:border-purple-500/30 transition-colors">
                    <span className={`text-lg font-bold tracking-tight ${current.textClass}`}>
                      {current.name}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 rounded bg-black/40 border border-white/5 p-2 transition-all group-hover:border-purple-500/20">
                      <code className="block text-[10px] font-mono text-muted-foreground break-all line-clamp-1 select-all">
                        {markdown}
                      </code>
                    </div>
                    <button
                      onClick={handleCopyMarkdown}
                      className={`shrink-0 w-8 h-8 flex items-center justify-center rounded transition-all duration-300 ${copied ? 'bg-green-500/20 text-green-400' : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg'
                        }`}
                      title="Copy Markdown"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Add to Profile */}
            <div className="relative p-3 rounded-xl bg-background/40 border border-border/50 backdrop-blur-sm shadow-inner group">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400 shrink-0 border border-blue-500/30">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-semibold text-foreground block mb-2">Add to Profile</span>
                  <button
                    onClick={handleAddToGitHub}
                    disabled={user?.github_login === 'demo-user'}
                    className="w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-foreground text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Open Profile README
                  </button>
                </div>
              </div>
            </div>

            {user?.github_login === 'demo-user' && (
              <div className="px-3 py-2 rounded-lg bg-orange-500/5 border border-orange-500/20 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                <p className="text-[10px] text-orange-400/90 font-medium">
                  Login with GitHub to enable live stats
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expandable ladder */}
      {showLadder && (
        <div className="px-3 pb-3 pt-1">
          <div className="space-y-1">
            {CONTRIBUTOR_LEVELS.map((level) => {
              const isCurrentLevel = level.rank === current.rank
              const isUnlocked = totalCoins >= level.minCoins
              return (
                <div
                  key={level.rank}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${isCurrentLevel
                    ? `${level.bgClass} border ${level.borderClass}`
                    : isUnlocked
                      ? 'bg-secondary/20'
                      : 'opacity-40'
                    }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isUnlocked ? level.bgClass : 'bg-secondary'
                    }`}>
                    <LevelIcon
                      level={level}
                      className={`w-3.5 h-3.5 ${isUnlocked ? level.textClass : 'text-muted-foreground'}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium ${isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {level.name}
                      </span>
                      {isCurrentLevel && (
                        <span className={`text-[9px] px-1 py-0.5 rounded ${level.bgClass} ${level.textClass} font-bold uppercase`}>
                          You
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-2xs font-mono ${isUnlocked ? level.textClass : 'text-muted-foreground'}`}>
                    {level.minCoins.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
