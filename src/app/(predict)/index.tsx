import { useState, useMemo, useCallback } from 'react'; // useCallback used in MatchPickCard
import {
  View, Text, Pressable, ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPrediction, type PredictedWinner } from '@/hooks/useUserPrediction';
import { useAllMatches, type AllMatchItem } from '@/hooks/useAllMatches';
import { TeamBadge } from '@/components/home/HomeShared';
import { colors, spacing, font, radius } from '@/constants/theme';
import type { AdaptedMatch } from '@/utils/matchAdapter';
import type { FootballMatch } from '@/types/football';

// ── Types ─────────────────────────────────────────────────────

type FilterTab = 'all' | 'cricket' | 'football';

type MatchSport = 'cricket' | 'football';

interface NormalizedMatch {
  matchId:     string;
  sport:       MatchSport;
  leagueLabel: string;
  leagueId:    string;
  dateStr:     string;
  t1Name:  string; t1Short: string; t1Logo: string;
  t2Name:  string; t2Short: string; t2Logo: string;
  hasDraw: boolean;
  onPress: () => void;
}

type ListRow =
  | { _t: 'header'; label: string }
  | { _t: 'match';  data: NormalizedMatch };

// ── Helpers ────────────────────────────────────────────────────

const BILATERAL_IDS = new Set(['T20I', 'WT20I', 'WODI']);

function sportColor(sport: MatchSport): string {
  return sport === 'football' ? '#3B82F6' : '#22C55E';
}

function isTbd(name: string): boolean {
  const n = name.trim().toUpperCase();
  return n === 'TBD' || n === 'TBC' || n === '' || n === 'UNKNOWN' || n === 'UNK';
}

function dateBucket(dateStr: string): string {
  const d        = new Date(dateStr);
  const now      = new Date();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diff = Math.floor((d.getTime() - todayMid.getTime()) / 86_400_000);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff <= 7)  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
  return 'Later';
}

function timeLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function dayLabel(dateStr: string): string {
  const d   = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return 'Today';
  if (d.toDateString() === new Date(now.getTime() + 86_400_000).toDateString())
    return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ── MatchPickCard (compact list card, light theme) ─────────────

function MatchPickCard({ data }: { data: NormalizedMatch }) {
  const { user, profile, isAuthenticated } = useAuth();
  const { query, submit, change }          = useUserPrediction(data.matchId, isAuthenticated);

  const existing     = query.data;
  const isSubmitting = submit.isPending || change.isPending;
  const hasPicked    = !!existing;
  // has_changed = true means they already used their one allowed change — pick is now locked
  const isLocked     = !!existing?.has_changed;
  const displayName  = profile?.displayName ?? user?.displayName ?? 'User';
  const sColor       = sportColor(data.sport);

  // predicted_winner is stored as the actual team name (e.g. "Zimbabwe") NOT 'teamA'/'teamB'.
  // Compare case-insensitively against team names; also handle legacy literal values.
  const pw       = (existing?.predicted_winner ?? '').toLowerCase().trim();
  const t1Picked = hasPicked && (pw === 'teama' || pw === data.t1Name.toLowerCase().trim());
  const t2Picked = hasPicked && (pw === 'teamb' || pw === data.t2Name.toLowerCase().trim());
  const drPicked = hasPicked && !t1Picked && !t2Picked;

  const handlePick = useCallback((side: PredictedWinner) => {
    if (!isAuthenticated) { data.onPress(); return; }
    // Don't re-pick the same choice
    const isSame = (side === 'teamA' && t1Picked) || (side === 'teamB' && t2Picked) || (side === 'draw' && drPicked);
    if (isSame || isLocked) return;
    const name = side === 'teamA' ? data.t1Name : side === 'teamB' ? data.t2Name : 'draw';
    if (existing) {
      change.mutate({ predictedWinner: name });
    } else {
      submit.mutate({
        predictedWinner: name,
        teamA: data.t1Name, teamB: data.t2Name,
        sport: data.sport,
        displayName,
      });
    }
  }, [isAuthenticated, existing, isLocked, t1Picked, t2Picked, drPicked, data, displayName, submit, change]);

  // Resolve status hint shown below the buttons
  const errorMsg  = change.isError
    ? 'Change failed — you can only change your pick once'
    : submit.isError
    ? 'Failed to submit — please try again'
    : null;

  // Non-picked buttons: dimmer when locked vs just picked
  const unpickedOpacity = isLocked ? 0.22 : 0.45;

  return (
    <View style={{
      backgroundColor: colors.card,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      borderRadius: radius.xl,
      borderWidth:     hasPicked ? 1.5 : 1,
      borderColor:     hasPicked ? sColor + '40' : colors.border,
      overflow: 'hidden',
      borderLeftWidth: 4,
      borderLeftColor: isLocked ? '#94A3B8' : sColor,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    }}>
      {/* League + time row */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 6,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: sColor }} />
          <Text style={{ color: sColor, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.5 }} numberOfLines={1}>
            {data.leagueLabel.toUpperCase()}
          </Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 9.5, fontWeight: '500' }}>
          {dayLabel(data.dateStr)} · {timeLabel(data.dateStr)}
        </Text>
      </View>

      {/* Teams row */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
      }}>
        <TeamBadge logo={data.t1Logo} code={data.t1Short} name={data.t1Name} size={38} />
        <Text style={{
          flex: 1, marginLeft: 8,
          color: colors.textPrimary, fontSize: font.sm + 1, fontWeight: '800',
        }} numberOfLines={1}>
          {data.t1Short}
        </Text>
        <View style={{
          paddingHorizontal: 6, paddingVertical: 2,
          backgroundColor: colors.cardElevated, borderRadius: 6,
        }}>
          <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>
            vs
          </Text>
        </View>
        <Text style={{
          flex: 1, marginRight: 8,
          color: colors.textPrimary, fontSize: font.sm + 1, fontWeight: '800',
          textAlign: 'right',
        }} numberOfLines={1}>
          {data.t2Short}
        </Text>
        <TeamBadge logo={data.t2Logo} code={data.t2Short} name={data.t2Name} size={38} />
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md }} />

      {/* Pick area */}
      <View style={{ padding: spacing.md, paddingTop: spacing.sm }}>
        {query.isLoading ? (
          <View style={{ height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="small" color={sColor} />
          </View>
        ) : (
          <>
            {/* Buttons row */}
            <View style={{ flexDirection: 'row', gap: 6, opacity: isSubmitting ? 0.5 : 1 }}>
              {/* Team A */}
              <Pressable
                onPress={() => handlePick('teamA')}
                disabled={isSubmitting || (isLocked && !t1Picked)}
                style={({ pressed }) => ({
                  flex: 1, paddingVertical: 8.5,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
                  borderRadius: radius.md,
                  backgroundColor: t1Picked ? sColor : pressed ? sColor + '14' : sColor + '08',
                  borderWidth: t1Picked ? 0 : 1.5,
                  borderColor: sColor + '40',
                  opacity: hasPicked && !t1Picked ? unpickedOpacity : 1,
                })}
              >
                {t1Picked && <Ionicons name="checkmark" size={11} color="#fff" />}
                <Text style={{
                  color: t1Picked ? '#fff' : sColor,
                  fontSize: font.xs, fontWeight: '800', letterSpacing: 0.3,
                }} numberOfLines={1}>
                  {data.t1Short}
                </Text>
              </Pressable>

              {/* Draw (group-stage football only) */}
              {data.hasDraw && (
                <Pressable
                  onPress={() => handlePick('draw')}
                  disabled={isSubmitting || (isLocked && !drPicked)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 12, paddingVertical: 8.5,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
                    borderRadius: radius.md,
                    backgroundColor: drPicked ? '#7C3AED' : pressed ? '#7C3AED14' : '#7C3AED08',
                    borderWidth: drPicked ? 0 : 1.5,
                    borderColor: '#7C3AED40',
                    opacity: hasPicked && !drPicked ? unpickedOpacity : 1,
                  })}
                >
                  {drPicked && <Ionicons name="checkmark" size={11} color="#fff" />}
                  <Text style={{ color: drPicked ? '#fff' : '#7C3AED', fontSize: font.xs, fontWeight: '800' }}>
                    Draw
                  </Text>
                </Pressable>
              )}

              {/* Team B */}
              <Pressable
                onPress={() => handlePick('teamB')}
                disabled={isSubmitting || (isLocked && !t2Picked)}
                style={({ pressed }) => ({
                  flex: 1, paddingVertical: 8.5,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
                  borderRadius: radius.md,
                  backgroundColor: t2Picked ? sColor : pressed ? sColor + '14' : sColor + '08',
                  borderWidth: t2Picked ? 0 : 1.5,
                  borderColor: sColor + '40',
                  opacity: hasPicked && !t2Picked ? unpickedOpacity : 1,
                })}
              >
                {t2Picked && <Ionicons name="checkmark" size={11} color="#fff" />}
                <Text style={{
                  color: t2Picked ? '#fff' : sColor,
                  fontSize: font.xs, fontWeight: '800', letterSpacing: 0.3,
                }} numberOfLines={1}>
                  {data.t2Short}
                </Text>
              </Pressable>
            </View>

            {/* Status / hint row */}
            {errorMsg ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
                <Ionicons name="alert-circle" size={11} color="#EF4444" />
                <Text style={{ color: '#EF4444', fontSize: 9.5, fontWeight: '600', flex: 1 }}>
                  {errorMsg}
                </Text>
              </View>
            ) : hasPicked && isLocked ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
                <Ionicons name="lock-closed" size={10} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 9.5, fontWeight: '600' }}>
                  Pick locked · you've used your one change
                </Text>
              </View>
            ) : hasPicked ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
                <Ionicons name="swap-horizontal-outline" size={11} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 9.5, fontWeight: '500' }}>
                  Tap another to change · 1 change allowed
                </Text>
              </View>
            ) : !isAuthenticated ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 6 }}>
                <Ionicons name="person-outline" size={11} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 9.5, fontWeight: '500' }}>
                  Sign in to make predictions
                </Text>
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

// ── DateHeader ─────────────────────────────────────────────────

function DateHeader({ label }: { label: string }) {
  return (
    <View style={{
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.sm,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text style={{
          color: colors.textPrimary,
          fontSize: font.sm, fontWeight: '900',
          letterSpacing: 0.8, textTransform: 'uppercase',
        }}>
          {label}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>
    </View>
  );
}

// ── FilterTab ──────────────────────────────────────────────────

function TabPill({
  label, active, onPress,
}: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: active
          ? colors.accent
          : pressed ? colors.cardElevated : colors.card,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.border,
        opacity: pressed && !active ? 0.8 : 1,
      })}
    >
      <Text style={{
        color: active ? '#FFFFFF' : colors.textSecondary,
        fontSize: font.sm, fontWeight: '700',
      }}>
        {label}
      </Text>
    </Pressable>
  );
}

// ── Main Screen ────────────────────────────────────────────────

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',      label: 'All Sports' },
  { key: 'cricket',  label: 'Cricket'    },
  { key: 'football', label: 'Football'   },
];

export default function PredictPage() {
  const router    = useRouter();
  const [tab, setTab] = useState<FilterTab>('all');

  const { live, upcoming, isLoading } = useAllMatches();

  // Normalize AllMatchItem → NormalizedMatch
  const normalizedMatches = useMemo((): NormalizedMatch[] => {
    const out: NormalizedMatch[] = [];

    const addItems = (items: AllMatchItem[]) => {
      for (const item of items) {
        if (item.kind === 'cricket') {
          const m = item.match as AdaptedMatch;
          if (isTbd(m.team1Short) || isTbd(m.team2Short)) continue;
          if (isTbd(m.team1Name)  || isTbd(m.team2Name))  continue;
          const isBilateral = BILATERAL_IDS.has(item.leagueId);
          out.push({
            matchId:     String(m.id),
            sport:       'cricket',
            leagueLabel: item.leagueLabel || 'Cricket',
            leagueId:    item.leagueId,
            dateStr:     m.date,
            t1Name: m.team1Name, t1Short: m.team1Short, t1Logo: m.team1Logo,
            t2Name: m.team2Name, t2Short: m.team2Short, t2Logo: m.team2Logo,
            hasDraw: false,
            onPress: () => {
              const stageId = (m as any).stageId;
              if (isBilateral && stageId) {
                router.push(`/(international)/${stageId}` as any);
              } else if (isBilateral) {
                router.push('/(international)' as any);
              } else {
                router.push(`/(match-details)/${m.id}` as any);
              }
            },
          });
        } else {
          const m = item.match as FootballMatch;
          if (isTbd(m.homeTeam.shortName) || isTbd(m.awayTeam.shortName)) continue;
          out.push({
            matchId:     String(m.id),
            sport:       'football',
            leagueLabel: item.leagueLabel || 'WC 2026',
            leagueId:    item.leagueId,
            dateStr:     m.date,
            t1Name: m.homeTeam.name, t1Short: m.homeTeam.shortName, t1Logo: m.homeTeam.logo,
            t2Name: m.awayTeam.name, t2Short: m.awayTeam.shortName, t2Logo: m.awayTeam.logo,
            hasDraw: true,
            onPress: () => router.push(`/(match-details)/${m.id}?sport=football` as any),
          });
        }
      }
    };

    addItems(upcoming);
    addItems(live);

    // Deduplicate by matchId (live + upcoming can overlap)
    const seen = new Set<string>();
    return out
      .filter(m => { if (seen.has(m.matchId)) return false; seen.add(m.matchId); return true; })
      .sort((a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime());
  }, [upcoming, live, router]);

  // Apply tab filter
  const filtered = useMemo(() => {
    if (tab === 'all') return normalizedMatches;
    return normalizedMatches.filter(m => m.sport === tab);
  }, [normalizedMatches, tab]);

  // Build FlashList data with date section headers
  const listData = useMemo((): ListRow[] => {
    const rows: ListRow[] = [];
    let current = '';
    for (const match of filtered) {
      const bucket = dateBucket(match.dateStr);
      if (bucket !== current) {
        rows.push({ _t: 'header', label: bucket });
        current = bucket;
      }
      rows.push({ _t: 'match', data: match });
    }
    return rows;
  }, [filtered]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* ── Header ────────────────────────────── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
        gap: spacing.sm,
        backgroundColor: colors.bg,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: colors.cardElevated,
            alignItems: 'center', justifyContent: 'center',
          })}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{
            color: colors.textPrimary,
            fontSize: font.lg, fontWeight: '900', letterSpacing: -0.4,
          }}>
            Make Your Picks
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 1 }}>
            {filtered.length} {filtered.length === 1 ? 'match' : 'matches'} available
          </Text>
        </View>
        {/* Lightning bolt icon */}
        <View style={{
          width: 36, height: 36, borderRadius: 10,
          backgroundColor: colors.accent + '12',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name="flash" size={18} color={colors.accent} />
        </View>
      </View>

      {/* ── Filter tabs ───────────────────────── */}
      <View style={{
        flexDirection: 'row', gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.bg,
      }}>
        {TABS.map(t => (
          <TabPill
            key={t.key}
            label={t.label}
            active={tab === t.key}
            onPress={() => setTab(t.key)}
          />
        ))}
      </View>

      {/* ── Match list ────────────────────────── */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ color: colors.textMuted, fontSize: font.sm, marginTop: spacing.md }}>
            Loading fixtures…
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
          <Ionicons name="calendar-outline" size={42} color={colors.textMuted} />
          <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '700' }}>
            No matches found
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: font.sm, textAlign: 'center', maxWidth: 240 }}>
            Check back soon for upcoming fixtures to predict
          </Text>
        </View>
      ) : (
        <FlashList<any>
          data={listData}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyExtractor={(item: ListRow, index: number) =>
            item._t === 'header' ? `h-${item.label}-${index}` : `m-${item.data.matchId}`
          }
          renderItem={({ item }: { item: ListRow }) => {
            if (item._t === 'header') return <DateHeader label={item.label} />;
            return <MatchPickCard data={item.data} />;
          }}
        />
      )}
    </SafeAreaView>
  );
}
