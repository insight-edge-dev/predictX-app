import { View, Text } from 'react-native';
import { colors, font, spacing, radius } from '@/constants/theme';
import type { Player } from '@/services/matchService';

interface PlayerCardProps {
  player:     Player;
  teamColor?: string;
}

// ── Role helpers ──────────────────────────────────────────────

function getRoleColor(role: string): string {
  const r = role.toLowerCase();
  if (r.includes('wk') || r.includes('keeper'))            return '#F59E0B'; // amber
  if (r.includes('all') || r.includes('rounder'))          return '#10B981'; // green
  if (r.includes('bowl'))                                  return '#EF4444'; // red
  return '#3B82F6';                                                          // blue — batsman
}

function getRoleShort(role: string): string {
  const r = role.toLowerCase();
  if (r.includes('wk') || r.includes('keeper'))    return 'WK';
  if (r.includes('bat') && r.includes('all'))      return 'BAT-AR';
  if (r.includes('bowl') && r.includes('all'))     return 'BOWL-AR';
  if (r.includes('all') || r.includes('rounder'))  return 'AR';
  if (r.includes('bowl'))                          return 'BOWL';
  return 'BAT';
}

// ── Component ─────────────────────────────────────────────────

export function PlayerCard({ player, teamColor = colors.accent }: PlayerCardProps) {
  const initials = player.name
    .replace(/\s*\([^)]+\)/g, '') // strip (c), (wk) etc.
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const roleColor = player.role ? getRoleColor(player.role) : teamColor;
  const roleShort = player.role ? getRoleShort(player.role) : '';

  const displayName = player.name
    .replace(/\s*\(c\)/gi,  '')
    .replace(/\s*\(wk\)/gi, '')
    .trim();

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius:    radius.md,
        padding:         spacing.md,
        borderWidth:     1,
        borderColor:     colors.border,
        flexDirection:   'row',
        alignItems:      'center',
        gap:             spacing.sm,
        minHeight:       56,
      }}
    >
      {/* Avatar */}
      <View
        style={{
          width:           38,
          height:          38,
          borderRadius:    19,
          backgroundColor: teamColor + '18',
          borderWidth:     1.5,
          borderColor:     teamColor + '35',
          alignItems:      'center',
          justifyContent:  'center',
          flexShrink:      0,
        }}
      >
        <Text style={{ color: teamColor, fontSize: font.sm, fontWeight: '800' }}>
          {initials}
        </Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1, minWidth: 0 }}>
        {/* Name row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
          <Text
            style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '600', flexShrink: 1 }}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {player.isCaptain && (
            <View
              style={{
                backgroundColor: colors.accent + '25',
                borderRadius:    3,
                paddingHorizontal: 4,
                paddingVertical:   1,
              }}
            >
              <Text style={{ color: colors.accent, fontSize: 9, fontWeight: '800' }}>C</Text>
            </View>
          )}
          {player.isKeeper && (
            <View
              style={{
                backgroundColor: '#F59E0B25',
                borderRadius:    3,
                paddingHorizontal: 4,
                paddingVertical:   1,
              }}
            >
              <Text style={{ color: '#F59E0B', fontSize: 9, fontWeight: '800' }}>WK</Text>
            </View>
          )}
        </View>

        {/* Role badge */}
        {roleShort ? (
          <View
            style={{
              alignSelf:         'flex-start',
              marginTop:         3,
              backgroundColor:   roleColor + '18',
              borderRadius:      4,
              paddingHorizontal: 5,
              paddingVertical:   1,
              borderWidth:       1,
              borderColor:       roleColor + '30',
            }}
          >
            <Text style={{ color: roleColor, fontSize: 9, fontWeight: '700', letterSpacing: 0.3 }}>
              {roleShort}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
