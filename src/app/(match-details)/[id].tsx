/**
 * Match Detail Screen — /match/[id]
 *
 * Tabs: Scorecard | Overview | Squad
 *
 * Scorecard tab shows per-player batting stats with CricketIQ
 * predicted scores visualised as a bar alongside actuals.
 *
 * "Live Intelligence" card appears at the top of Scorecard when
 * the match is live, spotlighting current batsmen vs their predictions.
 */

import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFullMatch } from '@/hooks/useMatches';
import { usePredictions, findPrediction, type PlayerPrediction, type MatchPredictions } from '@/hooks/usePredictions';
import { type FullMatch } from '@/services/matchService';
import { colors, spacing, font, radius } from '@/constants/theme';
import { getTeamColor, getTeamLogo } from '@/theme/colors';
import { formatMatchDate } from '@/utils/date';

// ── Extended backend type ─────────────────────────────────────

type RawFull = FullMatch & {
  statusText?: string;
  overs1?:     string;
  overs2?:     string;
  toss?:       { winner: string; decision: string } | null;
  winner?:     string;
  series?:     string;
  seriesId?:   string | null;
};

// ── Tabs ──────────────────────────────────────────────────────

const TABS = ['Scorecard', 'Overview', 'Squad'] as const;
type Tab = (typeof TABS)[number];

// ── Helpers ───────────────────────────────────────────────────

function winnerFromStatus(statusText: string, t1Short: string, t2Short: string) {
  const s = statusText.toLowerCase();
  if (!s.includes('won')) return null;
  if (s.includes(t1Short.toLowerCase())) return 't1';
  if (s.includes(t2Short.toLowerCase())) return 't2';
  return null;
}

const SAFE_TEAM = { id: '', name: 'TBD', shortName: 'TBD', logo: '' } as const;

// ── TeamLogo ──────────────────────────────────────────────────

function TeamLogo({ logo, shortName, size }: { logo: string; shortName: string; size: number }) {
  const safeShort = shortName || 'TBD';
  const url       = getTeamLogo(logo ?? '', safeShort);
  const color     = getTeamColor(safeShort);
  if (url) {
    return (
      <Image source={{ uri: url }} style={{ width: size, height: size }} resizeMode="contain" />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color + '25', alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color, fontSize: size * 0.3, fontWeight: '700' }}>{shortName || '?'}</Text>
    </View>
  );
}

// ── MatchHeader ───────────────────────────────────────────────

function MatchHeader({ raw }: { raw: RawFull }) {
  const t1      = raw.team1 ?? SAFE_TEAM;
  const t2      = raw.team2 ?? SAFE_TEAM;
  const t1Color = getTeamColor(t1.shortName ?? 'TBD');
  const t2Color = getTeamColor(t2.shortName ?? 'TBD');
  const isLive  = raw.status === 'live';
  const isDone  = raw.status === 'completed';

  const statusText = raw.statusText ?? raw.matchDesc ?? '';
  const winner     = isDone ? winnerFromStatus(statusText, t1.shortName ?? '', t2.shortName ?? '') : null;
  const t1Wins     = winner === 't1';
  const t2Wins     = winner === 't2';
  const seriesName = raw.seriesName ?? raw.series ?? '';
  const stage      = raw.matchStage && raw.matchStage !== 'LEAGUE' ? raw.matchStage : null;

  return (
    <View>
      <LinearGradient
        colors={[t1Color + '55', '#0B0F1A', '#0B0F1A', t2Color + '55']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ paddingBottom: spacing.xxl }}
      >
        {/* Series + stage pill */}
        <View style={{ alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.lg }}>
          {stage && (
            <View style={{
              backgroundColor: colors.accent + '20', borderRadius: 12,
              paddingHorizontal: spacing.md, paddingVertical: 3,
              borderWidth: 1, borderColor: colors.accent + '40', marginBottom: spacing.sm,
            }}>
              <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '800', letterSpacing: 1 }}>
                ★ {stage}
              </Text>
            </View>
          )}
          <Text style={{ color: colors.textSecondary, fontSize: font.xs, textAlign: 'center' }} numberOfLines={1}>
            {seriesName}
          </Text>
        </View>

        {/* Teams row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg }}>
          {/* Team 1 */}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{
              padding: t1Wins ? 4 : 2, borderRadius: 44,
              borderWidth: t1Wins ? 2 : 0, borderColor: t1Color + '90',
            }}>
              <TeamLogo logo={t1.logo} shortName={t1.shortName} size={72} />
            </View>
            <Text style={{
              color: t1Wins ? '#FFFFFF' : colors.textSecondary,
              fontSize: font.lg, fontWeight: t1Wins ? '800' : '600',
              marginTop: spacing.sm, textAlign: 'center',
            }}>
              {t1.shortName}
            </Text>
            {raw.score1 ? (
              <Text style={{
                color: t1Wins ? '#FFFFFF' : colors.textSecondary,
                fontSize: 26, fontWeight: '800', marginTop: spacing.xs, letterSpacing: -0.5,
              }}>
                {raw.score1}
              </Text>
            ) : null}
            {raw.overs1 ? (
              <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 2 }}>
                ({raw.overs1} ov)
              </Text>
            ) : null}
          </View>

          {/* Center */}
          <View style={{ alignItems: 'center', paddingHorizontal: spacing.md, minWidth: 64 }}>
            {isLive ? (
              <View style={{
                backgroundColor: colors.live + '20', borderRadius: 16,
                paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
                borderWidth: 1, borderColor: colors.live + '50',
              }}>
                <Text style={{ color: colors.live, fontSize: font.sm, fontWeight: '800', letterSpacing: 1 }}>
                  ● LIVE
                </Text>
              </View>
            ) : (
              <Text style={{ color: colors.textMuted + '60', fontSize: font.xxl, fontWeight: '900' }}>VS</Text>
            )}
          </View>

          {/* Team 2 */}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{
              padding: t2Wins ? 4 : 2, borderRadius: 44,
              borderWidth: t2Wins ? 2 : 0, borderColor: t2Color + '90',
            }}>
              <TeamLogo logo={t2.logo} shortName={t2.shortName} size={72} />
            </View>
            <Text style={{
              color: t2Wins ? '#FFFFFF' : colors.textSecondary,
              fontSize: font.lg, fontWeight: t2Wins ? '800' : '600',
              marginTop: spacing.sm, textAlign: 'center',
            }}>
              {t2.shortName}
            </Text>
            {raw.score2 ? (
              <Text style={{
                color: t2Wins ? '#FFFFFF' : colors.textSecondary,
                fontSize: 26, fontWeight: '800', marginTop: spacing.xs, letterSpacing: -0.5,
              }}>
                {raw.score2}
              </Text>
            ) : null}
            {raw.overs2 ? (
              <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 2 }}>
                ({raw.overs2} ov)
              </Text>
            ) : null}
          </View>
        </View>

        {/* Status strip */}
        {statusText ? (
          <View style={{
            marginTop: spacing.xl, marginHorizontal: spacing.lg,
            backgroundColor: isLive ? colors.live + '15' : colors.cardElevated,
            borderRadius: radius.sm, paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderWidth: 1, borderColor: isLive ? colors.live + '30' : colors.border,
          }}>
            <Text style={{
              color: isLive ? colors.live : isDone ? '#FFFFFF' : colors.textSecondary,
              fontSize: font.sm, fontWeight: isDone ? '700' : '500', textAlign: 'center',
            }} numberOfLines={2}>
              {statusText}
            </Text>
          </View>
        ) : null}

        {/* Venue + date */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          marginTop: spacing.md, gap: spacing.lg,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: font.xs, marginLeft: 3 }} numberOfLines={1}>
              {raw.venue}
            </Text>
          </View>
          {raw.date ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: font.xs, marginLeft: 3 }}>
                {formatMatchDate(raw.date)}
              </Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>
      <View style={{ height: 1, backgroundColor: colors.border }} />
    </View>
  );
}

// ── TabBar ────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <View style={{
      flexDirection: 'row', backgroundColor: colors.bg,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    }}>
      {TABS.map((tab) => {
        const isActive = tab === active;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md }}
          >
            <Text style={{
              color: isActive ? colors.accent : colors.textSecondary,
              fontSize: font.sm, fontWeight: isActive ? '700' : '500',
            }}>
              {tab}
            </Text>
            {isActive && (
              <View style={{
                position: 'absolute', bottom: 0, width: '60%',
                height: 2, backgroundColor: colors.accent, borderRadius: 1,
              }} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Prediction bar ─────────────────────────────────────────────
// Shows actual vs predicted runs visually.
// actualRuns = null when innings hasn't started yet (squad view).

function PredictionBar({
  actualRuns,
  predictedRuns,
  maxRuns = 80,
}: {
  actualRuns:    number | null;
  predictedRuns: number;
  maxRuns?:      number;
}) {
  const predWidth  = (predictedRuns / maxRuns) * 100;
  const actWidth   = actualRuns != null ? (Math.min(actualRuns, maxRuns) / maxRuns) * 100 : 0;
  const ahead      = actualRuns != null && actualRuns > predictedRuns;
  const actColor   = ahead ? colors.success : colors.accent;

  return (
    <View style={{ marginTop: 6 }}>
      {/* Label row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '600' }}>
          {actualRuns != null
            ? `Actual ${actualRuns}  vs  Pred ${predictedRuns}`
            : `Predicted ${predictedRuns} runs`}
        </Text>
        {actualRuns != null && (
          <Text style={{
            fontSize: 10, fontWeight: '700',
            color: ahead ? colors.success : '#f59e0b',
          }}>
            {ahead ? `+${actualRuns - predictedRuns}` : `${actualRuns - predictedRuns}`}
          </Text>
        )}
      </View>

      {/* Bar track */}
      <View style={{
        height: 5, backgroundColor: colors.cardElevated,
        borderRadius: 3, overflow: 'hidden', position: 'relative',
      }}>
        {/* Predicted ghost */}
        <View style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${predWidth}%`, backgroundColor: colors.textMuted + '50',
          borderRadius: 3,
        }} />
        {/* Actual fill */}
        {actualRuns != null && (
          <View style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${actWidth}%`, backgroundColor: actColor,
            borderRadius: 3,
          }} />
        )}
      </View>
    </View>
  );
}

// ── Cricbuzz-style Scorecard ──────────────────────────────────

type BatsmanRowType = NonNullable<RawFull['scorecard']>[number]['batsmen'][number];
type BowlerRowType  = NonNullable<RawFull['scorecard']>[number]['bowlers'][number];
type InningsType    = NonNullable<RawFull['scorecard']>[number];

// Column widths for batting table
const BAT_COL = { R: 30, B: 30, FOURS: 26, SIXES: 26, SR: 44 };
// Column widths for bowling table
const BWL_COL = { O: 34, M: 26, R: 30, W: 26, ECO: 42 };

// Header row
function TableHeader({ cols }: { cols: Array<{ label: string; w: number }> }) {
  return (
    <View style={{
      flexDirection: 'row', paddingVertical: 6,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      backgroundColor: colors.cardElevated + 'a0',
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>
          Batter
        </Text>
      </View>
      {cols.map(({ label, w }) => (
        <Text key={label} style={{
          width: w, color: colors.textMuted, fontSize: 10,
          fontWeight: '700', textAlign: 'center', letterSpacing: 0.3,
        }}>
          {label}
        </Text>
      ))}
    </View>
  );
}

function BowlHeader() {
  return (
    <View style={{
      flexDirection: 'row', paddingVertical: 6,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      backgroundColor: colors.cardElevated + 'a0',
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>
          Bowler
        </Text>
      </View>
      {[
        { l: 'O', w: BWL_COL.O }, { l: 'M', w: BWL_COL.M },
        { l: 'R', w: BWL_COL.R }, { l: 'W', w: BWL_COL.W },
        { l: 'Econ', w: BWL_COL.ECO },
      ].map(({ l, w }) => (
        <Text key={l} style={{
          width: w, color: colors.textMuted, fontSize: 10,
          fontWeight: '700', textAlign: 'center', letterSpacing: 0.3,
        }}>
          {l}
        </Text>
      ))}
    </View>
  );
}

// Batting row
function BatRow({
  row, index, pred,
}: {
  row:   BatsmanRowType;
  index: number;
  pred:  number | null;
}) {
  const cleanName = row.name.replace(/\s*\(c\)/i, '').replace(/\s*\(wk\)/i, '');
  const badge = (row.isCaptain ? ' (c)' : '') + (row.isKeeper ? ' †' : '');
  const runColor = row.isNotOut ? colors.success : colors.textPrimary;

  return (
    <View style={{
      backgroundColor: index % 2 === 0 ? 'transparent' : colors.cardElevated + '30',
      paddingVertical: 8, paddingHorizontal: 2,
      borderBottomWidth: 1, borderBottomColor: colors.border + '25',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {/* Name cell */}
        <View style={{ flex: 1, paddingRight: 4 }}>
          <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '600' }} numberOfLines={1}>
            {cleanName}{badge}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 1 }} numberOfLines={1}>
            {row.isNotOut ? 'not out' : (row.dismissal || 'did not bat')}
          </Text>
          {/* Prediction bar inline under name */}
          {pred != null && (
            <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ flex: 1, height: 3, backgroundColor: colors.cardElevated, borderRadius: 2, overflow: 'hidden' }}>
                {/* predicted ghost */}
                <View style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${Math.min((pred / 80) * 100, 100)}%`,
                  backgroundColor: colors.textMuted + '60',
                }} />
                {/* actual fill */}
                <View style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${Math.min((row.runs / 80) * 100, 100)}%`,
                  backgroundColor: row.runs >= pred ? colors.success : colors.accent,
                }} />
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '600', minWidth: 36 }}>
                pred {pred}
              </Text>
            </View>
          )}
        </View>
        {/* Stat cells */}
        <Text style={{ width: BAT_COL.R, textAlign: 'center', color: runColor, fontSize: font.sm, fontWeight: '700' }}>
          {row.runs}{row.isNotOut ? '*' : ''}
        </Text>
        <Text style={{ width: BAT_COL.B, textAlign: 'center', color: colors.textSecondary, fontSize: font.sm }}>
          {row.balls}
        </Text>
        <Text style={{ width: BAT_COL.FOURS, textAlign: 'center', color: colors.textSecondary, fontSize: font.sm }}>
          {row.fours}
        </Text>
        <Text style={{ width: BAT_COL.SIXES, textAlign: 'center', color: colors.textSecondary, fontSize: font.sm }}>
          {row.sixes}
        </Text>
        <Text style={{ width: BAT_COL.SR, textAlign: 'center', color: colors.textSecondary, fontSize: font.sm }}>
          {row.strikeRate > 0 ? row.strikeRate.toFixed(1) : '-'}
        </Text>
      </View>
    </View>
  );
}

// Bowling row
function BowlRow({ row, index }: { row: BowlerRowType; index: number }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: index % 2 === 0 ? 'transparent' : colors.cardElevated + '30',
      paddingVertical: 8, paddingHorizontal: 2,
      borderBottomWidth: 1, borderBottomColor: colors.border + '25',
    }}>
      <Text style={{ flex: 1, color: colors.textPrimary, fontSize: font.sm, fontWeight: '600' }} numberOfLines={1}>
        {row.name}
      </Text>
      <Text style={{ width: BWL_COL.O,   textAlign: 'center', color: colors.textSecondary, fontSize: font.sm }}>
        {row.overs}
      </Text>
      <Text style={{ width: BWL_COL.M,   textAlign: 'center', color: colors.textSecondary, fontSize: font.sm }}>
        {row.maidens}
      </Text>
      <Text style={{ width: BWL_COL.R,   textAlign: 'center', color: colors.textSecondary, fontSize: font.sm }}>
        {row.runs}
      </Text>
      <Text style={{
        width: BWL_COL.W, textAlign: 'center', fontSize: font.sm, fontWeight: '700',
        color: row.wickets > 0 ? colors.accent : colors.textSecondary,
      }}>
        {row.wickets}
      </Text>
      <Text style={{ width: BWL_COL.ECO, textAlign: 'center', color: colors.textSecondary, fontSize: font.sm }}>
        {row.economy > 0 ? row.economy.toFixed(2) : '-'}
      </Text>
    </View>
  );
}

// ── Live win probability calculator ──────────────────────────
function calcWinProb(
  statusText: string,
  scorecard:  InningsType[] | null | undefined,
): { chaserPct: number; defenderPct: number; chaserName: string } | null {
  if (!statusText || !scorecard || scorecard.length < 2) return null;

  const needMatch = statusText.match(/(\w+)\s+need\s+(\d+)\s+runs?\s+in\s+(\d+)\s+balls?/i);
  const crrMatch  = statusText.match(/CRR[:\s]+([\d.]+)/i);
  const rrrMatch  = statusText.match(/RRR[:\s]+([\d.]+)/i);
  if (!needMatch || !crrMatch || !rrrMatch) return null;

  const crr  = parseFloat(crrMatch[1]);
  const rrr  = parseFloat(rrrMatch[1]);
  if (!rrr) return null;

  // wickets fallen in 2nd innings
  const inn2    = scorecard[1];
  const wickets = inn2?.total?.wickets
    ?? inn2?.batsmen?.filter((b) => !b.isNotOut).length
    ?? 0;

  // Base probability: CRR/RRR ratio shifted from 50%
  const rrrRatio  = crr / rrr;
  let   chaserPct = Math.round(50 + (rrrRatio - 1) * 45);
  chaserPct      -= Math.round(wickets * 2.5);
  chaserPct       = Math.max(5, Math.min(95, chaserPct));

  return {
    chaserPct,
    defenderPct: 100 - chaserPct,
    chaserName:  needMatch[1].toUpperCase(),
  };
}

// ── Live Intelligence card ────────────────────────────────────
function LiveIntelCard({
  batsmen,
  bowlers,
  predictions,
  statusText,
  scorecard,
  t1Short,
  t2Short,
  t1Color,
  t2Color,
}: {
  batsmen:     BatsmanRowType[];
  bowlers:     BowlerRowType[];
  predictions: PlayerPrediction[] | undefined;
  statusText:  string;
  scorecard:   InningsType[] | null | undefined;
  t1Short:     string;
  t2Short:     string;
  t1Color:     string;
  t2Color:     string;
}) {
  const notOut = batsmen.filter((b) => b.isNotOut).slice(0, 2);
  if (notOut.length === 0) return null;

  // Last 2 bowlers in the array = current + previous bowler
  const activeBowlers = bowlers.slice(-2).reverse();

  // Win probability (only meaningful in 2nd innings)
  const winProb = calcWinProb(statusText, scorecard);

  // Which team is chasing? Map chaserName → team color
  const chaserIsT1    = winProb?.chaserName === t1Short;
  const chaserColor   = chaserIsT1 ? t1Color   : t2Color;
  const defenderColor = chaserIsT1 ? t2Color   : t1Color;
  const defenderName  = chaserIsT1 ? t2Short   : t1Short;

  return (
    <View style={{
      borderRadius: radius.lg, overflow: 'hidden',
      marginBottom: spacing.md,
      borderWidth: 1, borderColor: colors.live + '35',
    }}>
      {/* Top accent line */}
      <View style={{ height: 2.5, backgroundColor: colors.live }} />

      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: colors.live + '12',
        paddingHorizontal: spacing.lg, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: colors.live + '20',
      }}>
        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.live }} />
        <Text style={{ color: colors.live, fontSize: font.xs, fontWeight: '800', letterSpacing: 1.2, flex: 1 }}>
          LIVE INTELLIGENCE
        </Text>
        <View style={{
          backgroundColor: colors.live + '15', borderRadius: 12,
          paddingHorizontal: 8, paddingVertical: 3,
          borderWidth: 1, borderColor: colors.live + '30',
        }}>
          <Text style={{ color: colors.live, fontSize: 10, fontWeight: '700' }}>UPDATING</Text>
        </View>
      </View>

      <View style={{ backgroundColor: colors.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>

        {/* ── At the crease ── */}
        <Text style={{
          color: colors.textMuted, fontSize: 10, fontWeight: '700',
          letterSpacing: 1.2, marginBottom: spacing.sm,
        }}>
          AT THE CREASE
        </Text>

        {notOut.map((b, i) => {
          const pred    = findPrediction(b.name, predictions);
          const clean   = b.name.replace(/\s*\(c\)/i, '').replace(/\s*\(wk\)/i, '').trim();
          const badge   = (b.isCaptain ? ' (c)' : '') + (b.isKeeper ? ' †' : '');
          const sr      = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '–';
          const isAhead = pred != null && b.runs > pred;
          const diff    = pred != null ? b.runs - pred : null;
          // Max bar scale: whichever is bigger of actual vs predicted, min 40
          const scale   = Math.max(pred ?? 0, b.runs, 40);

          return (
            <View key={i} style={{
              marginBottom: i < notOut.length - 1 ? 14 : 0,
              paddingBottom: i < notOut.length - 1 ? 14 : 0,
              borderBottomWidth: i < notOut.length - 1 ? 1 : 0,
              borderBottomColor: colors.border + '50',
            }}>
              {/* Row: name left — score right */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    {/* On-strike dot: first not-out batter is typically on strike */}
                    {i === 0 && (
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.live }} />
                    )}
                    <Text style={{ color: '#FFFFFF', fontSize: font.md, fontWeight: '800' }} numberOfLines={1}>
                      {clean}{badge}
                    </Text>
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                    {b.balls}b · SR {sr}
                  </Text>
                </View>

                {/* Live score */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.live, fontSize: 28, fontWeight: '900', lineHeight: 30, letterSpacing: -0.5 }}>
                    {b.runs}*
                  </Text>
                  {/* Prediction badge next to score */}
                  {pred != null ? (
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      marginTop: 2,
                    }}>
                      <Text style={{ color: colors.textMuted, fontSize: 9 }}>pred</Text>
                      <View style={{
                        backgroundColor: isAhead ? colors.success + '20' : colors.accent + '18',
                        borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                        borderWidth: 1,
                        borderColor: isAhead ? colors.success + '40' : colors.accent + '35',
                      }}>
                        <Text style={{
                          color: isAhead ? colors.success : colors.accent,
                          fontSize: 11, fontWeight: '800',
                        }}>
                          {pred}
                        </Text>
                      </View>
                      {diff !== null && (
                        <Text style={{
                          color: isAhead ? colors.success : '#f87171',
                          fontSize: 10, fontWeight: '700',
                        }}>
                          {isAhead ? `+${diff}` : `${diff}`}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text style={{ color: colors.textMuted + '60', fontSize: 9, marginTop: 2 }}>
                      no pred
                    </Text>
                  )}
                </View>
              </View>

              {/* Dual prediction bar — only when pred available */}
              {pred != null && (
                <View>
                  {/* Labels */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '600' }}>
                      Live {b.runs} runs
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '600' }}>
                      Predicted {pred} runs
                    </Text>
                  </View>
                  {/* Bar track */}
                  <View style={{ height: 5, backgroundColor: colors.cardElevated, borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                    {/* Predicted target ghost */}
                    <View style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: `${Math.min((pred / scale) * 100, 100)}%`,
                      backgroundColor: colors.accent + '40',
                      borderRadius: 3,
                    }} />
                    {/* Actual progress */}
                    <View style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: `${Math.min((b.runs / scale) * 100, 100)}%`,
                      backgroundColor: isAhead ? colors.success : colors.live,
                      borderRadius: 3,
                    }} />
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {/* ── Current bowlers ── */}
        {activeBowlers.length > 0 && (
          <>
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />
            <Text style={{
              color: colors.textMuted, fontSize: 10, fontWeight: '700',
              letterSpacing: 1.2, marginBottom: spacing.sm,
            }}>
              BOWLING
            </Text>
            {activeBowlers.map((bwl, i) => {
              // Detect mid-over bowler: overs has a decimal part > 0
              const isMidOver = (bwl.overs % 1) > 0;
              return (
                <View key={i} style={{
                  flexDirection: 'row', alignItems: 'center',
                  marginBottom: i < activeBowlers.length - 1 ? spacing.sm : 0,
                }}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {isMidOver && (
                      <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.live }} />
                    )}
                    <Text style={{
                      color: isMidOver ? '#fff' : colors.textSecondary,
                      fontSize: font.sm,
                      fontWeight: isMidOver ? '700' : '400',
                    }} numberOfLines={1}>
                      {bwl.name}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted, fontSize: font.xs, minWidth: 32 }}>
                      {bwl.overs} ov
                    </Text>
                    <Text style={{
                      color: bwl.wickets > 0 ? colors.accent : colors.textSecondary,
                      fontSize: font.sm, fontWeight: bwl.wickets > 0 ? '700' : '400', minWidth: 36,
                    }}>
                      {bwl.wickets}/{bwl.runs}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: font.xs, minWidth: 42, textAlign: 'right' }}>
                      Eco {bwl.economy > 0 ? bwl.economy.toFixed(1) : '–'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* ── Live Win Probability ── */}
        {winProb && (
          <>
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />
            <Text style={{
              color: colors.textMuted, fontSize: 10, fontWeight: '700',
              letterSpacing: 1.2, marginBottom: spacing.md, textAlign: 'center',
            }}>
              LIVE WIN PROBABILITY
            </Text>

            {/* Team labels + percentages */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: defenderColor, fontSize: font.xs, fontWeight: '700' }}>{defenderName}</Text>
                <Text style={{ color: defenderColor, fontSize: 22, fontWeight: '900' }}>{winProb.defenderPct}%</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ color: chaserColor, fontSize: font.xs, fontWeight: '700', textAlign: 'right' }}>
                  {winProb.chaserName}
                </Text>
                <Text style={{ color: chaserColor, fontSize: 22, fontWeight: '900' }}>{winProb.chaserPct}%</Text>
              </View>
            </View>

            {/* Probability bar */}
            <View style={{ height: 8, borderRadius: 4, overflow: 'hidden', flexDirection: 'row' }}>
              <View style={{ flex: winProb.defenderPct, backgroundColor: defenderColor + 'CC' }} />
              <View style={{ flex: winProb.chaserPct,   backgroundColor: chaserColor   + 'CC' }} />
            </View>

            <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 6 }}>
              Based on CRR · RRR · wickets in hand
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

// Full innings scorecard table
function CricbuzzInningsTable({
  inning,
  allPredictions,
}: {
  inning:         InningsType;
  allPredictions: PlayerPrediction[] | undefined;
}) {
  const { extras, total, yetToBat, fow } = inning;

  // Build extras string like "7 (NB 2, W 3, LB 2)"
  const extrasStr = (() => {
    if (!extras) return '';
    const parts: string[] = [];
    if (extras.nb > 0)  parts.push(`NB ${extras.nb}`);
    if (extras.wd > 0)  parts.push(`W ${extras.wd}`);
    if (extras.lb > 0)  parts.push(`LB ${extras.lb}`);
    if (extras.b  > 0)  parts.push(`B ${extras.b}`);
    return parts.length ? `(${parts.join(', ')})` : '';
  })();

  const totalStr = total
    ? `${total.runs} (${total.wickets} wkts${total.overs ? `, ${total.overs} ov` : ''})`
    : '';

  return (
    <View style={{
      backgroundColor: colors.card, borderRadius: radius.md,
      borderWidth: 1, borderColor: colors.border,
      marginBottom: spacing.xl, overflow: 'hidden',
    }}>
      {/* Innings header */}
      <View style={{
        backgroundColor: colors.cardElevated,
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Text style={{ color: '#fff', fontSize: font.sm, fontWeight: '800' }}>{inning.inning}</Text>
        {totalStr ? (
          <Text style={{ color: colors.accent, fontSize: font.sm, fontWeight: '700' }}>{totalStr}</Text>
        ) : null}
      </View>

      {/* Batting section */}
      {inning.batsmen.length > 0 && (
        <View style={{ paddingHorizontal: spacing.md }}>
          <TableHeader cols={[
            { label: 'R',  w: BAT_COL.R    },
            { label: 'B',  w: BAT_COL.B    },
            { label: '4s', w: BAT_COL.FOURS },
            { label: '6s', w: BAT_COL.SIXES },
            { label: 'SR', w: BAT_COL.SR   },
          ]} />
          {inning.batsmen.map((row, i) => (
            <BatRow
              key={row.id || `bat-${i}`}
              row={row}
              index={i}
              pred={findPrediction(row.name, allPredictions)}
            />
          ))}

          {/* Extras row */}
          {extras && (
            <View style={{
              flexDirection: 'row', paddingVertical: 7,
              borderBottomWidth: 1, borderBottomColor: colors.border + '40',
            }}>
              <Text style={{ flex: 1, color: colors.textMuted, fontSize: font.sm }}>Extras</Text>
              <Text style={{ color: colors.textMuted, fontSize: font.sm }}>
                {extras.runs} {extrasStr}
              </Text>
            </View>
          )}

          {/* Total row */}
          {total && (
            <View style={{
              flexDirection: 'row', paddingVertical: 8,
              borderBottomWidth: inning.yetToBat?.length > 0 || fow?.length > 0 ? 1 : 0,
              borderBottomColor: colors.border + '40',
            }}>
              <Text style={{ flex: 1, color: colors.textSecondary, fontSize: font.sm, fontWeight: '700' }}>
                Total runs
              </Text>
              <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '800' }}>
                {total.runs} ({total.wickets} wkts, {total.overs} ov)
              </Text>
            </View>
          )}

          {/* Yet to bat */}
          {yetToBat && yetToBat.length > 0 && (
            <View style={{
              paddingVertical: 7,
              borderBottomWidth: fow?.length > 0 ? 1 : 0,
              borderBottomColor: colors.border + '40',
            }}>
              <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 3 }}>
                Yet to bat
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: font.xs, lineHeight: 16 }}>
                {yetToBat.join(', ')}
              </Text>
            </View>
          )}

          {/* Fall of wickets */}
          {fow && fow.length > 0 && (
            <View style={{ paddingVertical: 7 }}>
              <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 3 }}>
                Fall of wickets
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: font.xs, lineHeight: 16 }}>
                {fow.map((f, i) => `${i + 1}-${f.runs} (${f.player}, ${f.over})`).join(' · ')}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Bowling section */}
      {inning.bowlers.length > 0 && (
        <View style={{
          paddingHorizontal: spacing.md,
          borderTopWidth: 1, borderTopColor: colors.border,
          marginTop: inning.batsmen.length > 0 ? spacing.xs : 0,
        }}>
          <BowlHeader />
          {inning.bowlers.map((row, i) => (
            <BowlRow key={row.id || `bowl-${i}`} row={row} index={i} />
          ))}
        </View>
      )}
    </View>
  );
}

// ── MatchSummaryCard (no scorecard available) ─────────────────

function MatchSummaryCard({ raw }: { raw: RawFull }) {
  const t1     = raw.team1 ?? SAFE_TEAM;
  const t2     = raw.team2 ?? SAFE_TEAM;
  const isDone = raw.status === 'completed';
  const isLive = raw.status === 'live';

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{
        backgroundColor: colors.card, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
      }}>
        <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '700', letterSpacing: 1.5, marginBottom: spacing.lg }}>
          MATCH SCORES
        </Text>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary, fontSize: font.sm, fontWeight: '600', marginBottom: spacing.xs }}>
              {t1.shortName}
            </Text>
            {raw.score1 ? (
              <>
                <Text style={{ color: colors.textPrimary, fontSize: 32, fontWeight: '800', letterSpacing: -1 }}>{raw.score1}</Text>
                {raw.overs1 ? <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 2 }}>({raw.overs1} ov)</Text> : null}
              </>
            ) : (
              <Text style={{ color: colors.textMuted, fontSize: font.xxl }}>—</Text>
            )}
          </View>
          <View style={{ width: 1, backgroundColor: colors.border, marginVertical: spacing.xs }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary, fontSize: font.sm, fontWeight: '600', marginBottom: spacing.xs }}>
              {t2.shortName}
            </Text>
            {raw.score2 ? (
              <>
                <Text style={{ color: colors.textPrimary, fontSize: 32, fontWeight: '800', letterSpacing: -1 }}>{raw.score2}</Text>
                {raw.overs2 ? <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 2 }}>({raw.overs2} ov)</Text> : null}
              </>
            ) : (
              <Text style={{ color: colors.textMuted, fontSize: font.xxl }}>—</Text>
            )}
          </View>
        </View>
        {(isDone || isLive) && raw.statusText ? (
          <View style={{ marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ color: isDone ? colors.success : colors.live, fontSize: font.sm, fontWeight: '700', textAlign: 'center' }}>
              {raw.statusText}
            </Text>
          </View>
        ) : null}
      </View>
      {isDone && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: font.xs }}>Scorecard unavailable — pull to refresh</Text>
        </View>
      )}
    </View>
  );
}

// ── Overview tab ──────────────────────────────────────────────

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  if (!value) return null;
  return (
    <View style={{
      flexDirection: 'row', paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'flex-start',
    }}>
      <Text style={{ color: colors.textMuted, fontSize: font.sm, width: 100, flexShrink: 0 }}>
        {label}
      </Text>
      <Text style={{
        color: valueColor ?? colors.textPrimary, fontSize: font.sm,
        fontWeight: '600', flex: 1, textAlign: 'right',
      }} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: colors.card, borderRadius: radius.md,
      padding: spacing.lg, marginBottom: spacing.md,
      borderWidth: 1, borderColor: colors.border,
    }}>
      <Text style={{
        color: colors.textSecondary, fontSize: font.xs,
        fontWeight: '700', letterSpacing: 1.5, marginBottom: spacing.md,
      }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function OverviewTab({ raw }: { raw: RawFull }) {
  const toss   = raw.toss;
  const stage  = raw.matchStage && raw.matchStage !== 'LEAGUE' ? raw.matchStage : '';
  const series = raw.seriesName ?? raw.series ?? '';
  const statusText = raw.statusText ?? '';
  const tossLine   = toss?.winner ? `${toss.winner} won and chose to ${toss.decision || 'bat'}` : '';

  return (
    <View style={{ padding: spacing.lg }}>
      <SectionCard title="MATCH INFO">
        <InfoRow label="Series"  value={series} />
        <InfoRow label="Format"  value={raw.matchType ? raw.matchType.toUpperCase() : 'T20'} />
        <InfoRow label="Stage"   value={stage} valueColor={colors.accent} />
        <InfoRow label="Match"   value={raw.matchDesc ?? ''} />
      </SectionCard>
      <SectionCard title="VENUE & SCHEDULE">
        <InfoRow label="Venue" value={raw.venue ?? ''} />
        <InfoRow label="Date"  value={raw.date ? formatMatchDate(raw.date) : ''} />
        <InfoRow label="Time"  value={raw.time ?? ''} />
      </SectionCard>
      <SectionCard title="MATCH DETAILS">
        <InfoRow label="Toss"   value={tossLine} />
        <InfoRow label="Status" value={statusText} />
        {raw.status === 'completed' && statusText && (
          <InfoRow label="Result" value={statusText} valueColor={colors.success} />
        )}
      </SectionCard>
    </View>
  );
}

// ── Squad tab with predictions ────────────────────────────────

function PlayerPredictionRow({
  player,
  prediction,
  index,
}: {
  player:     { name: string; role: string };
  prediction: PlayerPrediction | undefined;
  index:      number;
}) {
  const roleColors: Record<string, string> = {
    'BAT':    '#60a5fa',
    'WK-BAT': '#34d399',
    'WK':     '#34d399',
    'ALL':    '#f59e0b',
    'BOL':    '#f87171',
  };
  const roleColor = roleColors[player.role] ?? colors.textMuted;

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: index > 0 ? 0 : 0,
      backgroundColor: index % 2 === 0 ? 'transparent' : colors.cardElevated + '30',
      borderRadius: 4, paddingHorizontal: spacing.xs,
    }}>
      <View style={{
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: roleColor + '20', alignItems: 'center', justifyContent: 'center',
        marginRight: spacing.sm,
      }}>
        <Text style={{ color: roleColor, fontSize: 9, fontWeight: '800' }}>
          {player.role.slice(0, 2)}
        </Text>
      </View>
      <Text style={{ flex: 1, color: colors.textPrimary, fontSize: font.sm, fontWeight: '600' }} numberOfLines={1}>
        {player.name}
      </Text>
      {prediction ? (
        <View style={{ alignItems: 'flex-end', minWidth: 80 }}>
          <Text style={{ color: colors.accent, fontSize: font.sm, fontWeight: '700' }}>
            ~{prediction.predictedRuns} runs
          </Text>
          <PredictionBar actualRuns={null} predictedRuns={prediction.predictedRuns} maxRuns={60} />
        </View>
      ) : (
        <Text style={{ color: colors.textMuted, fontSize: font.xs }}>—</Text>
      )}
    </View>
  );
}

function SquadWithPredictions({
  raw,
  predictions,
}: {
  raw:         RawFull;
  predictions: MatchPredictions | undefined;
}) {
  const [selectedTeam, setSelectedTeam] = useState<'team1' | 'team2'>('team1');
  const t1 = raw.team1 ?? SAFE_TEAM;
  const t2 = raw.team2 ?? SAFE_TEAM;
  const t1Color = getTeamColor(t1.shortName);
  const t2Color = getTeamColor(t2.shortName);

  const squad = raw.squad;

  if (!squad || (!squad.team1Players?.length && !squad.team2Players?.length)) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: spacing.xl }}>
        <View style={{
          width: 72, height: 72, borderRadius: 22,
          backgroundColor: colors.cardElevated,
          alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
        }}>
          <Ionicons name="people-outline" size={32} color={colors.textMuted} />
        </View>
        <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '700', textAlign: 'center' }}>
          Squad not available
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.sm, marginTop: spacing.sm, textAlign: 'center', lineHeight: 20 }}>
          The playing XI will appear here{'\n'}once teams are announced
        </Text>
      </View>
    );
  }

  const teamKey    = selectedTeam === 'team1' ? 'team1Players' : 'team2Players';
  const predKey    = selectedTeam === 'team1' ? 'team1' : 'team2';
  const players    = squad[teamKey] ?? [];
  const preds      = predictions?.[predKey] ?? [];
  const activeColor = selectedTeam === 'team1' ? t1Color : t2Color;

  return (
    <View>
      {/* Team selector */}
      <View style={{
        flexDirection: 'row', marginBottom: spacing.lg,
        backgroundColor: colors.cardElevated, borderRadius: radius.md,
        padding: 4, borderWidth: 1, borderColor: colors.border,
      }}>
        {(['team1', 'team2'] as const).map((key) => {
          const isActive = selectedTeam === key;
          const name     = key === 'team1' ? t1.shortName : t2.shortName;
          const color    = key === 'team1' ? t1Color : t2Color;
          return (
            <Pressable
              key={key}
              onPress={() => setSelectedTeam(key)}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.sm,
                backgroundColor: isActive ? color + '25' : 'transparent',
                borderWidth: isActive ? 1 : 0, borderColor: color + '60',
              }}
            >
              <Text style={{ color: isActive ? color : colors.textMuted, fontSize: font.sm, fontWeight: '700' }}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Predictions legend */}
      {preds.length > 0 && (
        <View style={{
          backgroundColor: colors.accent + '10', borderRadius: radius.sm,
          paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
          marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
          borderWidth: 1, borderColor: colors.accent + '25',
        }}>
          <Ionicons name="bulb-outline" size={14} color={colors.accent} />
          <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '600' }}>
            CricketIQ predicted runs for this match
          </Text>
        </View>
      )}

      {/* Player list */}
      <View style={{
        backgroundColor: colors.card, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.border, padding: spacing.md,
      }}>
        {players.map((p, i) => {
          const pred = preds.find((pr) => {
            const a = pr.name.toLowerCase();
            const b = p.name.toLowerCase();
            return a === b || a.includes(b.split(' ').pop()!) || b.includes(a.split(' ').pop()!);
          });
          return (
            <PlayerPredictionRow key={p.id || i} player={p} prediction={pred} index={i} />
          );
        })}
      </View>
    </View>
  );
}

// ── Skeleton ──────────────────────────────────────────────────

function SkeletonBlock({ width = '100%', height = 16, r = 4, style }: {
  width?: number | `${number}%`; height?: number; r?: number; style?: object;
}) {
  return (
    <View style={[{ width, height, borderRadius: r, backgroundColor: colors.cardElevated }, style]} />
  );
}

function MatchDetailSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{
        padding: spacing.xl, paddingTop: spacing.xxxl, alignItems: 'center',
        backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <SkeletonBlock width="50%" height={10} style={{ marginBottom: spacing.xl }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
          <View style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
            <SkeletonBlock width={72} height={72} r={36} />
            <SkeletonBlock width="60%" height={14} />
            <SkeletonBlock width="80%" height={22} />
          </View>
          <SkeletonBlock width={32} height={32} r={16} style={{ marginHorizontal: spacing.md }} />
          <View style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
            <SkeletonBlock width={72} height={72} r={36} />
            <SkeletonBlock width="60%" height={14} />
            <SkeletonBlock width="80%" height={22} />
          </View>
        </View>
        <SkeletonBlock width="85%" height={36} r={radius.sm} style={{ marginTop: spacing.xl }} />
      </View>
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        {[1, 2, 3, 4, 5].map((k) => (
          <SkeletonBlock key={k} width="100%" height={72} r={radius.sm} />
        ))}
      </View>
    </View>
  );
}

// ── Error state ───────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{
      flex: 1, alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.bg, padding: spacing.xxxl,
    }}>
      <View style={{
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: colors.dangerDim, alignItems: 'center', justifyContent: 'center',
        marginBottom: spacing.xl,
      }}>
        <Ionicons name="cloud-offline-outline" size={36} color={colors.danger} />
      </View>
      <Text style={{ color: colors.textPrimary, fontSize: font.xl, fontWeight: '700', marginBottom: spacing.sm, textAlign: 'center' }}>
        Failed to load match
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: font.md, textAlign: 'center', marginBottom: spacing.xxl }}>
        Check your connection and try again
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => ({
          opacity: pressed ? 0.8 : 1,
          backgroundColor: colors.accent, borderRadius: radius.sm,
          paddingHorizontal: spacing.xxxl, paddingVertical: spacing.md,
        })}
      >
        <Text style={{ color: '#fff', fontSize: font.base, fontWeight: '700' }}>Retry</Text>
      </Pressable>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function MatchDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  // Default to Squad tab for upcoming matches (no scorecard available yet)
  const [activeTab, setActiveTab]         = useState<Tab>('Scorecard');
  // Will be updated once match status is known
  const [activeInnings, setActiveInnings] = useState(0);
  const [inningsInitialized, setInningsInitialized] = useState(false);

  const {
    data: match, isLoading, isError, isRefetching, refetch,
  } = useFullMatch(id ?? '');

  const { data: predictions } = usePredictions(id ?? '');

  const BackButton = (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.bg,
    }}>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1, flexDirection: 'row', alignItems: 'center', padding: spacing.xs,
        })}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        <Text style={{ color: colors.textPrimary, fontSize: font.md, fontWeight: '600', marginLeft: 2 }}>
          Matches
        </Text>
      </Pressable>
      {match?.status === 'live' && (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isRefetching
            ? <ActivityIndicator size="small" color={colors.live} />
            : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.live }} />
          }
          <Text style={{ color: colors.live, fontSize: font.xs, fontWeight: '700', marginLeft: 6 }}>
            LIVE
          </Text>
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        {BackButton}
        <MatchDetailSkeleton />
      </SafeAreaView>
    );
  }

  if (isError || !match) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        {BackButton}
        <ErrorState onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  const raw = match as RawFull;

  if (!raw.team1?.shortName || !raw.team2?.shortName) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        {BackButton}
        <ErrorState onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  const t1Color   = getTeamColor(raw.team1.shortName);
  const t2Color   = getTeamColor(raw.team2.shortName);
  const isLive    = raw.status === 'live';
  const isUpcoming = raw.status === 'upcoming';

  // Auto-select latest innings on first load for live/completed
  if (!inningsInitialized && raw.scorecard && raw.scorecard.length > 0) {
    setActiveInnings(raw.scorecard.length - 1);
    setInningsInitialized(true);
  }

  // Auto-switch to Squad tab for upcoming matches (no scorecard yet)
  if (!inningsInitialized && isUpcoming && activeTab === 'Scorecard') {
    setActiveTab('Squad');
    setInningsInitialized(true);
  }

  // Combine both teams' prediction players for scorecard matching
  const allPredPlayers = [
    ...(predictions?.team1 ?? []),
    ...(predictions?.team2 ?? []),
  ];

  // Content per tab
  const TabContent = (
    <View style={{ minHeight: 500, backgroundColor: colors.bg }}>

      {/* ── Scorecard ─────────────────────────────────── */}
      {activeTab === 'Scorecard' && (
        <View style={{ paddingTop: spacing.sm }}>
          {raw.scorecard && raw.scorecard.length > 0 ? (
            <>
              {/* Innings tab switcher */}
              {raw.scorecard.length > 1 && (
                <View style={{
                  flexDirection: 'row', marginHorizontal: spacing.md,
                  marginBottom: spacing.md, backgroundColor: colors.cardElevated,
                  borderRadius: radius.sm, padding: 3,
                  borderWidth: 1, borderColor: colors.border,
                }}>
                  {raw.scorecard.map((inn, idx) => {
                    const active = activeInnings === idx;
                    // Shorten label: "SRH Inning 1" → "SRH 1st" etc.
                    const parts = inn.inning.split(' ');
                    const teamName = parts[0] ?? inn.inning;
                    const innNum   = idx + 1;
                    const label    = `${teamName} ${innNum === 1 ? '1st' : '2nd'} Inn`;
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => setActiveInnings(idx)}
                        style={{
                          flex: 1, alignItems: 'center', paddingVertical: 7,
                          borderRadius: radius.sm - 1,
                          backgroundColor: active ? colors.accent + '22' : 'transparent',
                          borderWidth: active ? 1 : 0,
                          borderColor: colors.accent + '60',
                        }}
                      >
                        <Text style={{
                          color: active ? colors.accent : colors.textMuted,
                          fontSize: font.xs, fontWeight: active ? '800' : '500',
                        }} numberOfLines={1}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Live Intelligence card for current innings */}
              {isLive && (() => {
                const currentInning = raw.scorecard![activeInnings];
                if (!currentInning) return null;
                return (
                  <View style={{ paddingHorizontal: spacing.md }}>
                    <LiveIntelCard
                      batsmen={currentInning.batsmen}
                      bowlers={currentInning.bowlers}
                      predictions={allPredPlayers}
                      statusText={raw.statusText ?? ''}
                      scorecard={raw.scorecard}
                      t1Short={raw.team1?.shortName ?? ''}
                      t2Short={raw.team2?.shortName ?? ''}
                      t1Color={t1Color}
                      t2Color={t2Color}
                    />
                  </View>
                );
              })()}

              {/* Predictions hint */}
              {allPredPlayers.length > 0 && (
                <View style={{
                  backgroundColor: colors.accent + '10',
                  marginHorizontal: spacing.md,
                  borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 6,
                  marginBottom: spacing.sm, flexDirection: 'row',
                  alignItems: 'center', gap: spacing.sm,
                  borderWidth: 1, borderColor: colors.accent + '20',
                }}>
                  <Ionicons name="analytics-outline" size={12} color={colors.accent} />
                  <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '600' }}>
                    Bar under name = predicted runs (blue ghost / colored actual)
                  </Text>
                </View>
              )}

              {/* Active innings table */}
              {raw.scorecard[activeInnings] && (
                <View style={{ paddingHorizontal: spacing.md }}>
                  <CricbuzzInningsTable
                    inning={raw.scorecard[activeInnings]}
                    allPredictions={allPredPlayers}
                  />
                </View>
              )}
            </>
          ) : (
            <View style={{ padding: spacing.md }}>
              <MatchSummaryCard raw={raw} />
              {/* Squad-based predictions when no scorecard yet */}
              {allPredPlayers.length > 0 && (
                <View style={{ marginTop: spacing.lg }}>
                  <View style={{
                    backgroundColor: colors.accent + '10', borderRadius: radius.md,
                    padding: spacing.lg, borderWidth: 1, borderColor: colors.accent + '25',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                      <Ionicons name="bulb" size={16} color={colors.accent} />
                      <Text style={{ color: colors.accent, fontSize: font.sm, fontWeight: '800' }}>
                        CricketIQ Pre-Match Predictions
                      </Text>
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: font.xs, marginBottom: spacing.md }}>
                      Batting score predictions based on player roles and IPL averages
                    </Text>
                    {[
                      { label: raw.team1?.shortName ?? 'T1', preds: predictions?.team1 ?? [] },
                      { label: raw.team2?.shortName ?? 'T2', preds: predictions?.team2 ?? [] },
                    ].map(({ label, preds }) => preds.length > 0 ? (
                      <View key={label} style={{ marginBottom: spacing.md }}>
                        <Text style={{
                          color: colors.textSecondary, fontSize: font.xs, fontWeight: '700',
                          letterSpacing: 1, marginBottom: spacing.sm,
                        }}>
                          {label}
                        </Text>
                        {preds.slice(0, 6).map((p, i) => (
                          <View key={i} style={{
                            flexDirection: 'row', alignItems: 'center',
                            paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border + '50',
                          }}>
                            <Text style={{ flex: 1, color: colors.textPrimary, fontSize: font.sm }} numberOfLines={1}>
                              {p.name}
                            </Text>
                            <Text style={{ color: colors.accent, fontSize: font.sm, fontWeight: '700', marginRight: spacing.sm }}>
                              ~{p.predictedRuns}
                            </Text>
                            <PredictionBar actualRuns={null} predictedRuns={p.predictedRuns} maxRuns={60} />
                          </View>
                        ))}
                      </View>
                    ) : null)}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* ── Overview ──────────────────────────────────── */}
      {activeTab === 'Overview' && <OverviewTab raw={raw} />}

      {/* ── Squad ─────────────────────────────────────── */}
      {activeTab === 'Squad' && (
        <View style={{ padding: spacing.lg }}>
          <SquadWithPredictions raw={raw} predictions={predictions} />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {BackButton}
      <ScrollView
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* [0] Scrolls away */}
        <MatchHeader raw={raw} />

        {/* [1] Sticky */}
        <TabBar active={activeTab} onChange={setActiveTab} />

        {/* [2] Content */}
        {TabContent}
      </ScrollView>
    </SafeAreaView>
  );
}
