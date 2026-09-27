import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { TestStatus } from '../testRunner/types';

export const colors = {
  bg: '#0f1115',
  card: '#181b22',
  cardAlt: '#1f232c',
  border: '#2a2f3a',
  text: '#e6e8ee',
  muted: '#9aa3b2',
  accent: '#6ea8ff',
  ok: '#3ecf8e',
  verified: '#1fa971',
  warn: '#f5a524',
  danger: '#ff5c5c',
  info: '#8b7bff',
};

export const STATUS_COLORS: Record<TestStatus, string> = {
  NOT_RUN: '#5b6475',
  RUNNING: colors.accent,
  LOCAL_PASS: colors.ok,
  VERIFIED: colors.verified,
  FAIL: colors.danger,
  MANUAL_VERIFICATION_REQUIRED: colors.warn,
  SKIPPED: '#7a8190',
};

export function StatusBadge({ status }: { status: TestStatus }) {
  return (
    <View style={[styles.badge, { backgroundColor: STATUS_COLORS[status] }]} accessibilityLabel={`status ${status}`}>
      <Text style={styles.badgeText}>{status === 'MANUAL_VERIFICATION_REQUIRED' ? 'MANUAL' : status}</Text>
    </View>
  );
}

export function Card({ children, style, danger }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; danger?: boolean }) {
  return <View style={[styles.card, danger && { borderColor: colors.danger, borderWidth: 2 }, style]}>{children}</View>;
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}

export function H2({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}

export function P({ children, muted, mono, selectable }: { children: React.ReactNode; muted?: boolean; mono?: boolean; selectable?: boolean }) {
  return (
    <Text selectable={selectable} style={[styles.p, muted && { color: colors.muted }, mono && styles.mono]}>
      {children}
    </Text>
  );
}

export function KV({ k, v, color }: { k: string; v: React.ReactNode; color?: string }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.k}>{k}</Text>
      <Text selectable style={[styles.v, color ? { color } : null]}>
        {v === undefined || v === null || v === '' ? '—' : v}
      </Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
  busy,
  testID,
  small,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  busy?: boolean;
  testID?: string;
  small?: boolean;
}) {
  const bg = { primary: colors.accent, secondary: colors.cardAlt, danger: colors.danger, ghost: 'transparent' }[kind];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        kind === 'ghost' && { borderWidth: 1, borderColor: colors.border },
      ]}>
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, small && { fontSize: 12 }]}>{title}</Text>}
    </Pressable>
  );
}

export function Row({ children, wrap = true }: { children: React.ReactNode; wrap?: boolean }) {
  return <View style={[styles.row, wrap && { flexWrap: 'wrap' }]}>{children}</View>;
}

export function Banner({ text, kind = 'warn' }: { text: string; kind?: 'warn' | 'danger' | 'info' }) {
  const c = { warn: colors.warn, danger: colors.danger, info: colors.info }[kind];
  return (
    <View style={[styles.banner, { borderColor: c }]}>
      <Text style={[styles.p, { color: c }]}>{text}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 12, paddingBottom: 48, gap: 10 },
  card: { backgroundColor: colors.card, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border, gap: 6 },
  h1: { color: colors.text, fontSize: 20, fontWeight: '700' },
  h2: { color: colors.text, fontSize: 16, fontWeight: '700' },
  p: { color: colors.text, fontSize: 13, lineHeight: 18 },
  mono: { fontFamily: 'monospace', fontSize: 11 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  k: { color: colors.muted, fontSize: 12, flexShrink: 0 },
  v: { color: colors.text, fontSize: 12, flexShrink: 1, textAlign: 'right' },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  btnSmall: { paddingHorizontal: 10, paddingVertical: 6, minHeight: 30 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  badge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  banner: { borderWidth: 1, borderRadius: 8, padding: 10 },
});
