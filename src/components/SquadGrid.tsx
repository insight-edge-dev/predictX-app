import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { PlayerCard } from './PlayerCard';
import { colors, font, spacing, radius } from '@/constants/theme';
import type { FullMatch, Player } from '@/services/matchService';

interface SquadGridProps {
  squad:       FullMatch['squad'];
  team1Short?: string;
  team2Short?: string;
  team1Color?: string;
  team2Color?: string;
}

// ── Role ordering for grouping ────────────────────────────────

function roleOrder(role: string): number {
  const r = role.toLowerCase();
  if (r.includes('wk') || r.includes('keeper'))   return 0;
  if (r.includes('bat') && !r.includes('all'))    return 1;
  if (r.includes('all') || r.includes('rounder')) return 2;
  if (r.includes('bowl'))                         return 3;
  return 4;
}

function sortPlayers(players: Player[]): Player[] {
  return [...players].sort((a, b) => roleOrder(a.role) - roleOrder(b.role));
}

// ── Team tab selector ─────────────────────────────────────────

function TeamTabs({
  team1Label,
  team2Label,
  team1Color,
  team2Color,
  active,
  onChange,
}: {
  team1Label: string;
  team2Label: string;
  team1Color: string;
  team2Color: string;
  active:     1 | 2;
  onChange:   (t: 1 | 2) => void;
}) {
  return (
    <View
      style={{
        flexDirection:   'row',
        backgroundColor: colors.cardElevated,
        borderRadius:    radius.md,
        padding:         3,
        marginBottom:    spacing.lg,
        borderWidth:     1,
        borderColor:     colors.border,
      }}
    >
      {([1, 2] as const).map((n) => {
        const isActive = active === n;
        const label    = n === 1 ? team1Label : team2Label;
        const color    = n === 1 ? team1Color : team2Color;
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={({ pressed }) => ({
              flex:            1,
              alignItems:      'center',
              paddingVertical: spacing.sm,
              borderRadius:    radius.sm,
              opacity:         pressed ? 0.8 : 1,
              backgroundColor: isActive ? color + '20' : 'transparent',
              borderWidth:     isActive ? 1 : 0,
              borderColor:     isActive ? color + '50' : 'transparent',
            })}
          >
            <Text
              style={{
                color:      isActive ? color : colors.textMuted,
                fontSize:   font.sm,
                fontWeight: isActive ? '800' : '500',
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Players list ──────────────────────────────────────────────

function TeamPlayerList({ players, color }: { players: Player[]; color: string }) {
  if (players.length === 0) {
    return (
      <Text style={{ color: colors.textMuted, fontSize: font.md, paddingVertical: spacing.lg, textAlign: 'center' }}>
        Squad not announced yet
      </Text>
    );
  }

  const sorted = sortPlayers(players);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {sorted.map((player) => (
        <View key={player.id || player.name} style={{ width: '47.5%' }}>
          <PlayerCard player={player} teamColor={color} />
        </View>
      ))}
    </View>
  );
}

// ── SquadGrid ─────────────────────────────────────────────────

export function SquadGrid({
  squad,
  team1Short  = '',
  team2Short  = '',
  team1Color  = colors.accent,
  team2Color  = '#F59E0B',
}: SquadGridProps) {
  const [active, setActive] = useState<1 | 2>(1);

  if (!squad) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <Text style={{ color: colors.textSecondary, fontSize: font.md }}>
          Squad not available yet
        </Text>
      </View>
    );
  }

  const t1Name = squad.team1?.name || squad.team1?.shortName || team1Short || 'Team 1';
  const t2Name = squad.team2?.name || squad.team2?.shortName || team2Short || 'Team 2';

  const t1Label = team1Short || t1Name.split(' ').pop() || 'T1';
  const t2Label = team2Short || t2Name.split(' ').pop() || 'T2';

  const players     = active === 1 ? squad.team1Players : squad.team2Players;
  const activeColor = active === 1 ? team1Color : team2Color;
  const teamName    = active === 1 ? t1Name : t2Name;
  const count       = players?.length ?? 0;

  return (
    <View>
      <TeamTabs
        team1Label={t1Label}
        team2Label={t2Label}
        team1Color={team1Color}
        team2Color={team2Color}
        active={active}
        onChange={setActive}
      />

      {/* Team name + count */}
      <View
        style={{
          flexDirection:   'row',
          alignItems:      'center',
          marginBottom:    spacing.md,
          paddingBottom:   spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: activeColor + '25',
        }}
      >
        <View
          style={{
            width:           3,
            height:          14,
            backgroundColor: activeColor,
            borderRadius:    2,
            marginRight:     spacing.sm,
          }}
        />
        <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '700', flex: 1 }}
          numberOfLines={1}
        >
          {teamName}
        </Text>
        <View
          style={{
            backgroundColor: activeColor + '18',
            borderRadius:    radius.sm,
            paddingHorizontal: spacing.sm,
            paddingVertical:   2,
          }}
        >
          <Text style={{ color: activeColor, fontSize: font.xs, fontWeight: '700' }}>
            {count} players
          </Text>
        </View>
      </View>

      <TeamPlayerList players={players ?? []} color={activeColor} />
    </View>
  );
}
