import {
  View, Text, Pressable, ScrollView, ActivityIndicator,
} from 'react-native';
import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPrediction, type PredictedWinner } from '@/hooks/useUserPrediction';
import { colors, spacing, font, radius } from '@/constants/theme';
import { TeamBadge } from '@/components/home/HomeShared';

// ── Types ─────────────────────────────────────────────────────

export type MatchSport = 'cricket' | 'football' | 'international';

// ── Helpers ───────────────────────────────────────────────────

function isTbd(name: string): boolean {
  const n = name.trim().toUpperCase();
  return n === 'TBD' || n === 'TBC' || n === '' || n === 'UNKNOWN' || n === 'UNK';
}

function dayTimeLabel(dateStr: string): string {
  const d   = new Date(dateStr);
  const now = new Date();
  const dayStr      = d.toDateString();
  const todayStr    = now.toDateString();
  const tomorrowStr = new Date(now.getTime() + 86_400_000).toDateString();

  const day = dayStr === todayStr
    ? 'Today'
    : dayStr === tomorrowStr
    ? 'Tomorrow'
    : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day} · ${time}`;
}

// sport → header bg colour (rich, saturated)
function sportHeaderBg(sport: MatchSport): string {
  if (sport === 'football')      return '#1D4ED8'; // blue-700
  if (sport === 'international') return '#B45309'; // amber-700
  return '#15803D';                               // green-700
}

// sport → accent colour used for pick buttons
function sportColor(sport: MatchSport): string {
  if (sport === 'football')      return '#2563EB';
  if (sport === 'international') return '#D97706';
  return '#16A34A';
}

// ── PickBtn ───────────────────────────────────────────────────

function PickBtn({
  label, picked, color, onPress, disabled, narrow = false,
}: {
  label: string; picked: boolean; color: string;
  onPress: () => void; disabled: boolean; narrow?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flex:            narrow ? 0 : 1,
        paddingHorizontal: narrow ? 14 : 0,
        alignItems:      'center',
        justifyContent:  'center',
        paddingVertical: 8,
        borderRadius:    radius.md,
        backgroundColor: picked
          ? color
          : pressed
          ? color + '18'
          : color + '0C',
        borderWidth: 1.5,
        borderColor: picked ? color : color + '45',
      })}
    >
      <Text style={{
        color:         picked ? '#FFFFFF' : color,
        fontSize:      font.xs,
        fontWeight:    '800',
        letterSpacing: 0.4,
      }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// ── PredictCard ───────────────────────────────────────────────

interface CardProps {
  matchId:    string;
  t1Name:     string;
  t1Short:    string;
  t1Logo:     string;
  t2Name:     string;
  t2Short:    string;
  t2Logo:     string;
  sport:      MatchSport;
  dateStr:    string;
  league:     string;
  hasDraw:    boolean;
  onPress:    () => void;
}

function PredictCard({
  matchId, t1Name, t1Short, t1Logo,
  t2Name, t2Short, t2Logo,
  sport, dateStr, league, hasDraw, onPress,
}: CardProps) {
  const { user, profile, isAuthenticated } = useAuth();
  const { query, submit, change }          = useUserPrediction(matchId, isAuthenticated);

  const existing     = query.data;
  const isSubmitting = submit.isPending || change.isPending;
  const hasPicked    = !!existing;
  const isLocked     = !!existing?.has_changed;
  const pickedSide   = existing?.predicted_winner;
  const displayName  = profile?.displayName ?? user?.displayName ?? 'User';
  const headerBg     = sportHeaderBg(sport);
  const sColor       = sportColor(sport);

  // predicted_winner is stored as actual team name (e.g. "Zimbabwe") or the literal 'draw'.
  // Compare case-insensitively against both the legacy 'teamA'/'teamB' literals and real names.
  const pw = pickedSide?.toLowerCase().trim() ?? '';
  const t1Picked = hasPicked && (pw === 'teama' || pw === t1Name.toLowerCase().trim());
  const t2Picked = hasPicked && (pw === 'teamb' || pw === t2Name.toLowerCase().trim());
  const drPicked = hasPicked && !t1Picked && !t2Picked;

  const handlePick = useCallback((side: PredictedWinner) => {
    if (!isAuthenticated) { onPress(); return; }
    const isSame = (side === 'teamA' && t1Picked) || (side === 'teamB' && t2Picked) || (side === 'draw' && drPicked);
    if (isSame || isLocked) return;
    const name = side === 'teamA' ? t1Name : side === 'teamB' ? t2Name : 'draw';
    if (existing) {
      change.mutate({ predictedWinner: name });
    } else {
      submit.mutate({
        predictedWinner: name,
        teamA: t1Name, teamB: t2Name,
        sport: sport === 'international' ? 'cricket' : sport,
        displayName,
      });
    }
  }, [isAuthenticated, existing, isLocked, t1Picked, t2Picked, drPicked, t1Name, t2Name, sport, displayName, onPress, submit, change]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity:      pressed ? 0.93 : 1,
        width:        268,
        borderRadius: radius.xl,
        borderWidth:  hasPicked ? 1.5 : 1,
        borderColor:  hasPicked ? sColor + '50' : colors.border,
        marginRight:  spacing.md,
        overflow:     'hidden',
        backgroundColor: colors.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.10,
        shadowRadius: 10,
        elevation: 4,
      })}
    >
      {/* ── Coloured header (sport-specific) ── */}
      <View style={{ backgroundColor: headerBg, paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 14 }}>
        {/* League + time */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{
            color: 'rgba(255,255,255,0.90)', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.5, flex: 1,
          }} numberOfLines={1}>
            {league.toUpperCase()}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9, fontWeight: '500' }} numberOfLines={1}>
            {dayTimeLabel(dateStr)}
          </Text>
        </View>

        {/* Teams */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Team 1 */}
          <View style={{ flex: 1, alignItems: 'center', gap: 7 }}>
            <TeamBadge logo={t1Logo} code={t1Short} name={t1Name} size={54} />
            <Text style={{
              color: '#FFFFFF', fontSize: 12, fontWeight: '900',
              textAlign: 'center', letterSpacing: 0.2,
            }} numberOfLines={1}>
              {t1Short}
            </Text>
          </View>

          {/* VS */}
          <View style={{
            width: 30, height: 30, borderRadius: 15,
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
            alignItems: 'center', justifyContent: 'center',
            marginHorizontal: 4,
          }}>
            <Text style={{ color: 'rgba(255,255,255,0.80)', fontSize: 8.5, fontWeight: '900', letterSpacing: 0.5 }}>
              VS
            </Text>
          </View>

          {/* Team 2 */}
          <View style={{ flex: 1, alignItems: 'center', gap: 7 }}>
            <TeamBadge logo={t2Logo} code={t2Short} name={t2Name} size={54} />
            <Text style={{
              color: '#FFFFFF', fontSize: 12, fontWeight: '900',
              textAlign: 'center', letterSpacing: 0.2,
            }} numberOfLines={1}>
              {t2Short}
            </Text>
          </View>
        </View>
      </View>

      {/* ── White pick section ── */}
      <View style={{ backgroundColor: colors.card, padding: spacing.md, paddingTop: spacing.sm + 2 }}>
        {query.isLoading ? (
          <View style={{ height: 34, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="small" color={sColor} />
          </View>
        ) : hasPicked ? (
          /* Picked banner */
          <>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: isLocked ? '#F1F5F9' : sColor + '0F',
              borderRadius: radius.md,
              paddingHorizontal: spacing.sm + 2, paddingVertical: 8,
              borderWidth: 1, borderColor: isLocked ? '#CBD5E1' : sColor + '30',
            }}>
              <View style={{
                width: 18, height: 18, borderRadius: 9,
                backgroundColor: isLocked ? '#94A3B8' : sColor,
                alignItems: 'center', justifyContent: 'center',
                marginRight: 7,
              }}>
                <Ionicons name={isLocked ? 'lock-closed' : 'checkmark'} size={11} color="#fff" />
              </View>
              <Text style={{ flex: 1, color: isLocked ? '#475569' : sColor, fontSize: 11, fontWeight: '700' }}>
                {t1Picked ? t1Short : t2Picked ? t2Short : 'Draw'}
              </Text>
              {isLocked ? (
                <Text style={{ color: '#94A3B8', fontSize: 9.5, fontWeight: '600' }}>
                  Locked
                </Text>
              ) : (
                <Pressable
                  onPress={onPress}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '600' }}>
                    Change →
                  </Text>
                </Pressable>
              )}
            </View>
            {!isLocked && (
              <Text style={{ color: colors.textMuted, fontSize: 9, marginTop: 4, textAlign: 'center' }}>
                1 change allowed
              </Text>
            )}
          </>
        ) : (
          /* Pick buttons */
          <View style={{ flexDirection: 'row', gap: 6, opacity: isSubmitting ? 0.5 : 1 }}>
            <PickBtn
              label={t1Short} picked={t1Picked} color={sColor}
              onPress={() => handlePick('teamA')} disabled={isSubmitting}
            />
            {hasDraw && (
              <PickBtn
                label="Draw" picked={drPicked} color="#7C3AED"
                onPress={() => handlePick('draw')} disabled={isSubmitting}
                narrow
              />
            )}
            <PickBtn
              label={t2Short} picked={t2Picked} color={sColor}
              onPress={() => handlePick('teamB')} disabled={isSubmitting}
            />
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ── Section ────────────────────────────────────────────────────

interface CricketLike {
  id: string; team1Name: string; team1Short: string; team1Logo: string;
  team2Name: string; team2Short: string; team2Logo: string;
  date: string; leagueLabel?: string; stageId?: string;
}

interface FootballLike {
  id: string;
  homeTeam: { name: string; shortName: string; logo: string };
  awayTeam: { name: string; shortName: string; logo: string };
  date: string; stage?: string;
}

interface SectionProps {
  cricket:       CricketLike[];
  football:      FootballLike[];
  international: CricketLike[];
  onPressMatch:  (id: string, sport: MatchSport, stageId?: string) => void;
  onSeeAll?:     () => void;
}

const MAX_CARDS = 12;

export function QuickPredictSection({
  cricket, football, international, onPressMatch, onSeeAll,
}: SectionProps) {
  type Slot =
    | { sport: 'cricket' | 'international'; m: CricketLike }
    | { sport: 'football'; m: FootballLike };

  const now = Date.now();

  const all: (Slot & { ts: number })[] = [
    ...cricket.map(m => ({ sport: 'cricket' as const, m, ts: new Date(m.date).getTime() })),
    ...international.map(m => ({ sport: 'international' as const, m, ts: new Date(m.date).getTime() })),
    ...football.map(m => ({ sport: 'football' as const, m, ts: new Date(m.date).getTime() })),
  ]
    .filter(x => {
      if (x.ts <= now) return false;
      if (x.sport === 'football') {
        const m = x.m as FootballLike;
        return !isTbd(m.homeTeam.shortName) && !isTbd(m.awayTeam.shortName);
      }
      const m = x.m as CricketLike;
      return !isTbd(m.team1Short) && !isTbd(m.team2Short)
          && !isTbd(m.team1Name)  && !isTbd(m.team2Name);
    })
    .sort((a, b) => a.ts - b.ts)
    .slice(0, MAX_CARDS);

  if (all.length === 0) return null;

  return (
    <View style={{ marginBottom: spacing.xl }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        marginBottom: spacing.md, gap: spacing.sm,
      }}>
        <View style={{
          width: 32, height: 32, borderRadius: 10,
          backgroundColor: colors.accent,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name="flash" size={16} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            color: colors.textPrimary, fontSize: font.md + 1,
            fontWeight: '800', letterSpacing: -0.2,
          }}>
            Predict Now
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 1 }}>
            {all.length} upcoming {all.length === 1 ? 'match' : 'matches'}
          </Text>
        </View>
        {onSeeAll && (
          <Pressable
            onPress={onSeeAll}
            hitSlop={8}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              flexDirection: 'row', alignItems: 'center', gap: 2,
            })}
          >
            <Text style={{ color: colors.accent, fontSize: font.sm, fontWeight: '700' }}>
              See all
            </Text>
            <Ionicons name="chevron-forward" size={13} color={colors.accent} />
          </Pressable>
        )}
      </View>

      {/* Horizontal cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -spacing.lg }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 6 }}
      >
        {all.map(slot => {
          if (slot.sport === 'football') {
            const m = slot.m as FootballLike;
            return (
              <PredictCard
                key={`f-${m.id}`}
                matchId={m.id}
                t1Name={m.homeTeam.name}   t1Short={m.homeTeam.shortName}  t1Logo={m.homeTeam.logo}
                t2Name={m.awayTeam.name}   t2Short={m.awayTeam.shortName}  t2Logo={m.awayTeam.logo}
                sport="football"
                dateStr={m.date}
                league={m.stage ?? 'Football'}
                hasDraw
                onPress={() => onPressMatch(m.id, 'football')}
              />
            );
          }
          const m = slot.m as CricketLike;
          const prefix = slot.sport === 'international' ? 'i' : 'c';
          return (
            <PredictCard
              key={`${prefix}-${m.id}`}
              matchId={m.id}
              t1Name={m.team1Name}  t1Short={m.team1Short}  t1Logo={m.team1Logo}
              t2Name={m.team2Name}  t2Short={m.team2Short}  t2Logo={m.team2Logo}
              sport={slot.sport}
              dateStr={m.date}
              league={m.leagueLabel ?? 'Cricket'}
              hasDraw={false}
              onPress={() => onPressMatch(m.id, slot.sport, m.stageId)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}
