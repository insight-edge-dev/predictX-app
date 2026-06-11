import {
  View, Text, Pressable, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, font, radius } from '@/constants/theme';
import { getTeamColor } from '@/theme/colors';
import { TeamCrest } from '@/components/TeamCrest';
import { API_BASE_URL } from '@/config/api';
import type { AdaptedMatch } from '@/utils/matchAdapter';
import type { FootballMatch, FootballMatchWithTip } from '@/types/football';
import type { NewsItem } from '@/hooks/useHome';
import type { MatchWithTip } from '@/services/tipsService';
import type { StandingsRow } from '@/services/matchService';

// ── Design tokens ─────────────────────────────────────────────

export const C_CRICKET  = '#E6FF00';
export const C_FOOTBALL = '#16A34A';
export const C_LIVE     = '#EF4444';

// ── Static facts (rotate by day so every visit feels fresh) ───

export const WC_FACTS = [
  { icon: '🌍', text: 'Brazil is the only nation to have played in every FIFA World Cup — all 22 editions since 1930.', color: '#F59E0B' },
  { icon: '⚡', text: 'Germany has never lost a penalty shootout at the World Cup. Perfect record: 4 wins from 4.', color: '#10B981' },
  { icon: '🏠', text: 'Host nations win 58% of their World Cup matches — the biggest home advantage in any major sport.', color: '#6366F1' },
  { icon: '🏆', text: 'Only 8 countries have ever lifted the World Cup trophy across 22 tournaments. Brazil leads with 5 titles.', color: '#F59E0B' },
  { icon: '😰', text: 'Mexico has played in 17 World Cups and reached the Round of 16 in 8 consecutive editions — yet never won a shootout.', color: '#EF4444' },
  { icon: '🇦🇷', text: 'Argentina has won 86% of their World Cup penalty shootouts (6 of 7) — one of the best records in history.', color: '#3B82F6' },
  { icon: '📈', text: 'The 2026 World Cup expands to 48 teams and 104 matches — the largest in history.', color: '#8B5CF6' },
  { icon: '🥇', text: 'Uruguay won the inaugural 1930 World Cup on home soil — the first-ever host nation to win the title.', color: '#F59E0B' },
];

// ── Team flags (WC short codes → emoji) ───────────────────────

export const FB_FLAGS: Record<string, string> = {
  BRA: '🇧🇷', GER: '🇩🇪', ITA: '🇮🇹', ARG: '🇦🇷', FRA: '🇫🇷',
  URY: '🇺🇾', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', ESP: '🇪🇸', NED: '🇳🇱', POR: '🇵🇹',
  BEL: '🇧🇪', SUI: '🇨🇭', CRO: '🇭🇷', MEX: '🇲🇽', USA: '🇺🇸',
  SEN: '🇸🇳', MAR: '🇲🇦', JPN: '🇯🇵', KOR: '🇰🇷', AUS: '🇦🇺',
  DEN: '🇩🇰', SWE: '🇸🇪', POL: '🇵🇱', CZE: '🇨🇿', SRB: '🇷🇸',
  RUS: '🇷🇺', CMR: '🇨🇲', GHA: '🇬🇭', NGA: '🇳🇬', CRC: '🇨🇷',
  ECU: '🇪🇨', COL: '🇨🇴', PAR: '🇵🇾', CHI: '🇨🇱', ALG: '🇩🇿',
  CIV: '🇨🇮', TUN: '🇹🇳',
};
export function fbFlag(code: string) { return FB_FLAGS[code] ?? '🏳'; }

// ── Date / time helpers ───────────────────────────────────────

export function todayISO() { return new Date().toISOString().slice(0, 10); }
export function isToday(d: string) { return (d ?? '').slice(0, 10) === todayISO(); }

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
export function fmtDate() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
export function shortDate(d: string) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }); }
  catch { return d.slice(0, 10); }
}
export function timeAgo(ts: number | null) {
  if (!ts) return '';
  const mins = Math.floor((Date.now() - ts * 1000) / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── SectionHeader ─────────────────────────────────────────────

export function SectionHeader({ emoji, title, badge, onMore, moreLabel = 'See all →' }: {
  emoji: string; title: string; badge?: number; onMore?: () => void; moreLabel?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
      <Text style={{ fontSize: 16, marginRight: 6 }}>{emoji}</Text>
      <Text style={{ color: colors.textPrimary, fontSize: font.md, fontWeight: '800', flex: 1 }}>{title}</Text>
      {badge !== undefined && badge > 0 && (
        <View style={{ backgroundColor: C_LIVE, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginRight: spacing.xs }}>
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>{badge}</Text>
        </View>
      )}
      {onMore && (
        <Pressable onPress={onMore}>
          <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700' }}>{moreLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── EmptyCard ─────────────────────────────────────────────────

export function EmptyCard({ message }: { message: string }) {
  return (
    <View style={{
      backgroundColor: colors.card, borderRadius: radius.md,
      borderWidth: 1, borderColor: colors.border,
      padding: spacing.lg, alignItems: 'center', marginBottom: spacing.sm,
    }}>
      <Text style={{ color: colors.textMuted, fontSize: font.xs, textAlign: 'center' }}>{message}</Text>
    </View>
  );
}

// ── SportPill ─────────────────────────────────────────────────

export function SportPill({ emoji, label, color, textColor, onPress }: {
  emoji: string; label: string; color: string; textColor: string; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: color,
        borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 6,
      })}
    >
      <Text style={{ fontSize: 13 }}>{emoji}</Text>
      <Text style={{ color: textColor, fontSize: font.xs, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}

// ── CricketMatchCard ──────────────────────────────────────────

export function CricketMatchCard({ match, onPress, leagueLabel = 'IPL 2026' }: {
  match: AdaptedMatch; onPress: () => void; leagueLabel?: string;
}) {
  const isLive = match.status === 'live';
  const s1 = match.score1 ? (match.overs1 ? `${match.score1} (${match.overs1})` : match.score1) : null;
  const s2 = match.score2 ? (match.overs2 ? `${match.score2} (${match.overs2})` : match.score2) : null;

  return (
    <Pressable onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
        backgroundColor: colors.card, borderRadius: radius.lg,
        borderWidth: 1, borderColor: isLive ? C_CRICKET + '50' : colors.border,
        marginBottom: spacing.sm, flexDirection: 'row', overflow: 'hidden',
      })}>
      <View style={{ width: 3, backgroundColor: isLive ? C_LIVE : C_CRICKET + '70' }} />
      <View style={{ flex: 1, padding: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 11 }}>🏏</Text>
            <Text style={{ color: C_CRICKET, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>{leagueLabel}</Text>
          </View>
          {isLive ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C_LIVE + '22', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C_LIVE }} />
              <Text style={{ color: C_LIVE, fontSize: 9, fontWeight: '800' }}>LIVE</Text>
            </View>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: 10 }}>
              {isToday(match.date) ? match.time : `${shortDate(match.date)} · ${match.time}`}
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '800' }}>{match.team1Short}</Text>
            {isLive && s1 && <Text style={{ color: C_CRICKET, fontSize: 11, fontWeight: '600', marginTop: 2 }}>{s1}</Text>}
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 11, paddingHorizontal: spacing.sm }}>vs</Text>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '800' }}>{match.team2Short}</Text>
            {isLive && s2 && <Text style={{ color: C_CRICKET, fontSize: 11, fontWeight: '600', marginTop: 2 }}>{s2}</Text>}
          </View>
        </View>
        {match.result
          ? <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 5 }} numberOfLines={1}>{match.result}</Text>
          : match.venue
            ? <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 5 }} numberOfLines={1}>📍 {match.venue}</Text>
            : null}
      </View>
      <View style={{ justifyContent: 'center', paddingRight: spacing.sm }}>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

// ── FootballMatchCard ─────────────────────────────────────────

export function FootballMatchCard({ match, onPress }: { match: FootballMatch; onPress: () => void }) {
  const isLive  = match.status === 'live';
  const hasScore = match.score.home !== null && match.score.away !== null;

  return (
    <Pressable onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
        backgroundColor: colors.card, borderRadius: radius.lg,
        borderWidth: 1, borderColor: isLive ? C_FOOTBALL + '50' : colors.border,
        marginBottom: spacing.sm, flexDirection: 'row', overflow: 'hidden',
      })}>
      <View style={{ width: 3, backgroundColor: isLive ? C_LIVE : C_FOOTBALL + '70' }} />
      <View style={{ flex: 1, padding: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 11 }}>⚽</Text>
            <Text style={{ color: C_FOOTBALL, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>
              {'WC 2026'}{match.group ? ` · Group ${match.group}` : ''}
            </Text>
          </View>
          {isLive ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C_LIVE + '22', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C_LIVE }} />
              <Text style={{ color: C_LIVE, fontSize: 9, fontWeight: '800' }}>{match.minute ? `${match.minute}'` : 'LIVE'}</Text>
            </View>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: 10 }}>
              {isToday(match.date) ? match.time : `${shortDate(match.date)} · ${match.time}`}
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TeamCrest logo={match.homeTeam.logo} flag={match.homeTeam.flag} size={18} />
            <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '800' }}>
              {match.homeTeam.shortName}
            </Text>
          </View>
          {hasScore ? (
            <Text style={{ color: colors.textPrimary, fontSize: font.md, fontWeight: '900', paddingHorizontal: spacing.sm }}>
              {match.score.home} – {match.score.away}
            </Text>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: 11, paddingHorizontal: spacing.sm }}>vs</Text>
          )}
          <View style={{ flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <TeamCrest logo={match.awayTeam.logo} flag={match.awayTeam.flag} size={18} />
            <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '800' }}>
              {match.awayTeam.shortName}
            </Text>
          </View>
        </View>
        {match.venue ? (
          <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 5 }} numberOfLines={1}>📍 {match.venue}</Text>
        ) : null}
      </View>
      <View style={{ justifyContent: 'center', paddingRight: spacing.sm }}>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

// ── WC Countdown banner ───────────────────────────────────────

export function WCCountdownBanner({ onPress }: { onPress: () => void }) {
  const diffMs   = new Date('2026-06-11T00:00:00Z').getTime() - Date.now();
  const started  = diffMs <= 0;
  const diffDays = Math.max(0, Math.floor(diffMs / 86_400_000));
  const diffHrs  = Math.max(0, Math.floor((diffMs % 86_400_000) / 3_600_000));
  const label    = diffDays > 0 ? `${diffDays}d ${diffHrs}h` : diffMs > 0 ? `${diffHrs}h` : 'Underway!';

  return (
    <Pressable onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.9 : 1,
        backgroundColor: '#052e16', borderRadius: radius.xl,
        borderWidth: 1, borderColor: '#166534',
        padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        marginBottom: spacing.sm, overflow: 'hidden',
      })}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: C_FOOTBALL }} />
      <Text style={{ fontSize: 26 }}>⚽</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#86efac', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>FIFA WORLD CUP 2026</Text>
        <Text style={{ color: '#ffffff', fontSize: font.sm, fontWeight: '700', marginTop: 2 }}>USA · Canada · Mexico</Text>
        <Text style={{ color: '#4ade80', fontSize: 10, marginTop: 2 }}>48 teams · 12 groups · 104 matches</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {!started && <Text style={{ color: '#4ade80', fontSize: 10, fontWeight: '700' }}>KICKOFF IN</Text>}
        <Text style={{ color: '#ffffff', fontSize: font.md, fontWeight: '900' }}>{label}</Text>
        <Ionicons name="chevron-forward" size={14} color="#4ade80" style={{ marginTop: 2 }} />
      </View>
    </Pressable>
  );
}

// ── Expert pick card ────────────────────────────────────────────

export interface ExpertPredictionItem {
  id:               string;
  match_label:      string | null;
  predicted_winner: string;
  confidence:       'HIGH' | 'MEDIUM' | 'LOW';
  analysis:         string;
}

export function ExpertPickCard({ prediction, onPress }: { prediction: ExpertPredictionItem; onPress: () => void }) {
  const confColors = { HIGH: '#16a34a', MEDIUM: '#F59E0B', LOW: '#94A3B8' } as const;
  const c = confColors[prediction.confidence];

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, marginBottom: spacing.sm })}>
      <View style={{
        backgroundColor: colors.card, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="person" size={12} color="#a78bfa" />
            <Text style={{ color: '#a78bfa', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>EXPERT PICK</Text>
          </View>
          <View style={{ backgroundColor: c + '20', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: c + '40' }}>
            <Text style={{ color: c, fontSize: 9, fontWeight: '800' }}>{prediction.confidence}</Text>
          </View>
        </View>
        {prediction.match_label ? (
          <Text style={{ color: colors.textMuted, fontSize: 10, marginBottom: 6 }}>⚔️ {prediction.match_label}</Text>
        ) : null}
        <Text style={{ color: colors.warning, fontSize: 18, fontWeight: '900', marginBottom: spacing.sm }}>🏆 {prediction.predicted_winner}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: font.xs, lineHeight: 18 }} numberOfLines={3}>{prediction.analysis}</Text>
      </View>
    </Pressable>
  );
}

// ── AI Pick card (football) ────────────────────────────────────

export function AIPickCard({ tip, onPress }: { tip: FootballMatchWithTip; onPress: () => void }) {
  const pred = tip.tip;
  if (!pred) return null;

  const confColor = pred.confidenceLabel === 'HIGH' ? '#4ade80' : pred.confidenceLabel === 'MEDIUM' ? '#FACC15' : '#F87171';
  const confBg    = pred.confidenceLabel === 'HIGH' ? '#052e16' : pred.confidenceLabel === 'MEDIUM' ? '#1c1400' : '#1c0a0a';
  const winnerShort = pred.winner ?? null;

  return (
    <Pressable onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.87 : 1,
        backgroundColor: colors.card, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border,
        marginBottom: spacing.sm, overflow: 'hidden',
      })}>
      <View style={{ height: 2, backgroundColor: confColor }} />
      <View style={{ padding: spacing.md }}>
        {/* Match header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 11 }}>⚽</Text>
            <Text style={{ color: colors.textMuted, fontSize: 10 }}>
              {'WC 2026'}{tip.group ? ` · Group ${tip.group}` : ''}
            </Text>
          </View>
          <View style={{ backgroundColor: confBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: confColor + '50' }}>
            <Text style={{ color: confColor, fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>{pred.confidenceLabel}</Text>
          </View>
        </View>
        {/* Teams */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TeamCrest logo={tip.homeTeam.logo} flag={tip.homeTeam.flag} size={18} />
            <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '800' }}>
              {tip.homeTeam.shortName}
            </Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '500' }}>vs</Text>
          <View style={{ flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <TeamCrest logo={tip.awayTeam.logo} flag={tip.awayTeam.flag} size={18} />
            <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '800' }}>
              {tip.awayTeam.shortName}
            </Text>
          </View>
        </View>
        {/* Probability bar */}
        <View style={{ borderRadius: 4, overflow: 'hidden', height: 6, flexDirection: 'row', marginBottom: 6 }}>
          <View style={{ flex: pred.homeWin, backgroundColor: '#4ade80' }} />
          {pred.draw > 0 && <View style={{ flex: pred.draw, backgroundColor: '#6B7280' }} />}
          <View style={{ flex: pred.awayWin, backgroundColor: '#60a5fa' }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: '#4ade80', fontSize: 10, fontWeight: '700' }}>{pred.homeWin}%</Text>
          {pred.draw > 0 && <Text style={{ color: '#9CA3AF', fontSize: 10 }}>{pred.draw}% D</Text>}
          <Text style={{ color: '#60a5fa', fontSize: 10, fontWeight: '700' }}>{pred.awayWin}%</Text>
        </View>
        {winnerShort && (
          <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 11 }}>🤖</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
              PredictX tips <Text style={{ color: confColor, fontWeight: '700' }}>{winnerShort}</Text>
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ── Cricket Pick card ──────────────────────────────────────────

export function CricketPickCard({ match, onPress }: { match: MatchWithTip; onPress: () => void }) {
  const pred = match.tip;
  if (!pred) return null;

  const confColor = pred.confidenceLabel === 'HIGH' ? '#4ade80' : pred.confidenceLabel === 'MEDIUM' ? '#FACC15' : '#F87171';
  const confBg    = pred.confidenceLabel === 'HIGH' ? '#052e16' : pred.confidenceLabel === 'MEDIUM' ? '#1c1400' : '#1c0a0a';

  return (
    <Pressable onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.87 : 1,
        backgroundColor: colors.card, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border,
        marginBottom: spacing.sm, overflow: 'hidden',
      })}>
      <View style={{ height: 2, backgroundColor: confColor }} />
      <View style={{ padding: spacing.md }}>
        {/* Match header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 11 }}>🏏</Text>
            <Text style={{ color: colors.textMuted, fontSize: 10 }} numberOfLines={1}>{match.seriesName}</Text>
          </View>
          <View style={{ backgroundColor: confBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: confColor + '50' }}>
            <Text style={{ color: confColor, fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>{pred.confidenceLabel}</Text>
          </View>
        </View>
        {/* Teams */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '800', flex: 1 }}>
            {match.team1.shortName}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '500' }}>vs</Text>
          <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '800', flex: 1, textAlign: 'right' }}>
            {match.team2.shortName}
          </Text>
        </View>
        {/* Probability bar */}
        <View style={{ borderRadius: 4, overflow: 'hidden', height: 6, flexDirection: 'row', marginBottom: 6 }}>
          <View style={{ flex: pred.team1Pct, backgroundColor: C_CRICKET }} />
          <View style={{ flex: pred.team2Pct, backgroundColor: '#60a5fa' }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: C_CRICKET, fontSize: 10, fontWeight: '700' }}>{pred.team1Pct}%</Text>
          <Text style={{ color: '#60a5fa', fontSize: 10, fontWeight: '700' }}>{pred.team2Pct}%</Text>
        </View>
        {pred.winner && (
          <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 11 }}>🤖</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
              PredictX tips <Text style={{ color: confColor, fontWeight: '700' }}>{pred.winner}</Text>
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ── Mini standings table ───────────────────────────────────────

export function MiniStandingsTable({ rows, limit = 4 }: { rows: StandingsRow[]; limit?: number }) {
  if (rows.length === 0) return null;
  const top = rows.slice(0, limit);

  return (
    <View style={{
      backgroundColor: colors.card, borderRadius: radius.lg,
      borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        backgroundColor: colors.cardElevated,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Text style={{ width: 22, color: colors.textMuted, fontSize: font.xs, fontWeight: '700' }}>#</Text>
        <Text style={{ flex: 1, color: colors.textMuted, fontSize: font.xs, fontWeight: '700', letterSpacing: 0.5 }}>TEAM</Text>
        <Text style={{ width: 32, color: colors.textMuted, fontSize: font.xs, fontWeight: '700', textAlign: 'center' }}>P</Text>
        <Text style={{ width: 36, color: colors.textMuted, fontSize: font.xs, fontWeight: '700', textAlign: 'center' }}>PTS</Text>
      </View>

      {top.map((row, i) => {
        const teamColor = getTeamColor(row.teamShort);
        return (
          <View key={row.teamShort || String(i)} style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: spacing.md, paddingVertical: 10,
            borderBottomWidth: i < top.length - 1 ? 1 : 0,
            borderBottomColor: colors.border,
            backgroundColor: i % 2 === 1 ? colors.borderLight : 'transparent',
          }}>
            <Text style={{ width: 22, color: i < 4 ? colors.success : colors.textMuted, fontSize: font.sm, fontWeight: '700' }}>
              {i + 1}
            </Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              {row.logo ? (
                <Image source={{ uri: row.logo }} style={{ width: 22, height: 22, marginRight: spacing.sm }} resizeMode="contain" />
              ) : (
                <View style={{
                  width: 22, height: 22, borderRadius: 11, marginRight: spacing.sm,
                  backgroundColor: teamColor + '25', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ color: teamColor, fontSize: 8, fontWeight: '700' }}>{row.teamShort.slice(0, 2)}</Text>
                </View>
              )}
              <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }} numberOfLines={1}>
                {row.teamShort}
              </Text>
            </View>
            <Text style={{ width: 32, color: colors.textSecondary, fontSize: font.sm, textAlign: 'center' }}>{row.played}</Text>
            <Text style={{ width: 36, color: colors.accent, fontSize: font.sm, fontWeight: '700', textAlign: 'center' }}>{row.points}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── WC Stat Spotlight Card (horizontal scroll) ────────────────

export interface StatCard { icon: string; title: string; stat: string; desc: string; color: string; }

export function WCStatCard({ card }: { card: StatCard }) {
  return (
    <View style={{
      width: 148, backgroundColor: colors.card, borderRadius: radius.lg,
      borderWidth: 1, borderColor: card.color + '35',
      padding: spacing.md, overflow: 'hidden',
    }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: card.color }} />
      <Text style={{ fontSize: 24, marginBottom: 6, marginTop: 4 }}>{card.icon}</Text>
      <Text style={{ color: card.color, fontSize: 18, fontWeight: '900', letterSpacing: -0.5 }}>{card.stat}</Text>
      <Text style={{ color: colors.textPrimary, fontSize: 10, fontWeight: '700', marginTop: 3 }}>{card.title}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 9, marginTop: 3, lineHeight: 13 }}>{card.desc}</Text>
    </View>
  );
}

// ── Fact Card ─────────────────────────────────────────────────

export function FactCard({ icon, text, color }: { icon: string; text: string; color: string }) {
  return (
    <View style={{
      backgroundColor: colors.card, borderRadius: radius.lg,
      borderWidth: 1, borderColor: color + '30',
      padding: spacing.md, marginBottom: spacing.sm,
      flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    }}>
      <View style={{
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: font.xs, flex: 1, lineHeight: 18 }}>{text}</Text>
    </View>
  );
}

// ── News Card ─────────────────────────────────────────────────

export function NewsCard({ item, onPress }: { item: NewsItem; onPress: () => void }) {
  const imgUri = item.image ? `${API_BASE_URL}${item.image}` : null;

  return (
    <Pressable onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
        backgroundColor: colors.card, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border,
        marginBottom: spacing.sm, flexDirection: 'row',
        overflow: 'hidden',
      })}>
      {imgUri && (
        <Image
          source={{ uri: imgUri }}
          style={{ width: 80, height: 80 }}
          resizeMode="cover"
        />
      )}
      <View style={{ flex: 1, padding: spacing.sm, justifyContent: 'center' }}>
        <Text style={{ color: colors.textPrimary, fontSize: font.xs, fontWeight: '700', lineHeight: 16 }} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 3, lineHeight: 14 }} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
          {item.source ? <Text style={{ color: colors.accent, fontSize: 9, fontWeight: '700' }}>{item.source}</Text> : null}
          {item.pubTime ? <Text style={{ color: colors.textMuted, fontSize: 9 }}>· {timeAgo(item.pubTime)}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}
