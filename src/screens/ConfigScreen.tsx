import React, { useState } from 'react';
import { Alert, DevSettings, ScrollView } from 'react-native';
import { Button, Card, H1, H2, P, Row, Banner, colors, styles } from '../components/ui';
import { PROFILES, FEATURE_KEYS, type CustomOverrides, type ProfileId, type PrivacyToggles } from '../config/profiles';
import { writeJson, KEYS } from '../services/persistence';
import { useLabState } from '../hooks/useLab';

const PRIVACY_KEYS: (keyof PrivacyToggles)[] = ['maskTextInputs', 'maskImages', 'redactAuth', 'redactCookies', 'redactBodies'];

async function applyAndRestart(id: ProfileId, custom?: CustomOverrides) {
  await writeJson(KEYS.profile, id);
  if (custom) await writeJson(KEYS.customOverrides, custom);
  Alert.alert(
    'Profile saved',
    'ScaleBun.init() runs once per JS runtime, so the profile applies on restart. A full cold start (swipe away + relaunch) is the most faithful; JS reload is faster.',
    [
      { text: 'Later', style: 'cancel' },
      ...(__DEV__ ? [{ text: 'Reload JS now', onPress: () => DevSettings.reload('ScaleBun profile change') }] : []),
    ],
  );
}

export function ConfigScreen() {
  const s = useLabState();
  const [custom, setCustom] = useState<CustomOverrides>(s.custom ?? { features: {}, privacy: {} });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="screen-Config">
      <H1>Init profiles</H1>
      <P muted>Active: {s.profile.label}. Selecting a profile persists it and requires a restart.</P>
      {PROFILES.filter(p => p.id !== 'custom').map(p => (
        <Card key={p.id} style={p.id === s.profileId ? { borderColor: colors.accent, borderWidth: 2 } : undefined}>
          <H2>{p.label}</H2>
          <P muted>{p.description}</P>
          {p.warning && <Banner text={p.warning} />}
          <P muted>
            integration: {p.integration}
            {p.disabled.length ? ` · disables ${p.disabled.join(', ')}` : ''}
          </P>
          <Button small testID={`profile-${p.id}`} title={p.id === s.profileId ? 'Active' : 'Use this profile'} disabled={p.id === s.profileId} onPress={() => applyAndRestart(p.id)} />
        </Card>
      ))}
      <Card>
        <H2>Custom combination</H2>
        <P muted>Features (tap to toggle OFF/ON):</P>
        <Row>
          {FEATURE_KEYS.map(k => {
            const off = custom.features[k] === false;
            return (
              <Button key={k} small kind={off ? 'danger' : 'secondary'} title={`${k}: ${off ? 'OFF' : 'on'}`} onPress={() => setCustom(c => ({ ...c, features: { ...c.features, [k]: off ? undefined : false } }))} />
            );
          })}
        </Row>
        <P muted>Privacy (unset = SDK default):</P>
        <Row>
          {PRIVACY_KEYS.map(k => {
            const v = custom.privacy[k];
            const next = v === undefined ? true : v === true ? false : undefined;
            return <Button key={k} small kind={v === undefined ? 'ghost' : 'secondary'} title={`${k}: ${v === undefined ? 'default' : v}`} onPress={() => setCustom(c => ({ ...c, privacy: { ...c.privacy, [k]: next } }))} />;
          })}
        </Row>
        <Row>
          <Button small kind={custom.captureNetworkBodies ? 'secondary' : 'ghost'} title={`captureNetworkBodies: ${custom.captureNetworkBodies ?? 'default'}`} onPress={() => setCustom(c => ({ ...c, captureNetworkBodies: c.captureNetworkBodies ? undefined : true }))} />
        </Row>
        <Button title="Use custom combination" onPress={() => applyAndRestart('custom', custom)} />
      </Card>
    </ScrollView>
  );
}
