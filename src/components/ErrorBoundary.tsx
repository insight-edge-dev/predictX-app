import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { colors, font, spacing, radius } from '@/constants/theme';

interface Props   { children: React.ReactNode; }
interface State   { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] caught:', error.message, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
        <Text style={{ fontSize: 48, marginBottom: spacing.lg }}>🏏</Text>
        <Text style={{ color: colors.textPrimary, fontSize: font.xl, fontWeight: '900', textAlign: 'center', marginBottom: spacing.sm }}>
          Something went wrong
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.sm, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 20 }}>
          The app hit an unexpected error. Tap below to recover.
        </Text>
        <Pressable
          onPress={this.reset}
          style={({ pressed }) => ({
            backgroundColor: colors.accent, borderRadius: radius.lg,
            paddingVertical: 14, paddingHorizontal: 32,
            opacity: pressed ? 0.8 : 1, marginBottom: spacing.lg,
          })}
        >
          <Text style={{ color: colors.bg, fontWeight: '900', fontSize: font.base }}>Try Again</Text>
        </Pressable>
        {__DEV__ && this.state.error && (
          <ScrollView style={{ maxHeight: 160, width: '100%' }}>
            <View style={{ backgroundColor: colors.danger + '10', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.danger + '30' }}>
              <Text style={{ color: colors.danger, fontSize: 10, fontFamily: 'monospace' }}>
                {this.state.error.message}
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    );
  }
}
