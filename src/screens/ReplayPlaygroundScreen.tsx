import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Keyboard, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ScaleBunFlatList, ScaleBunScrollView, ScaleBunSectionList } from '@scalebun/react-native';
import { Button, Card, H1, H2, P, Row, colors, styles } from '../components/ui';
import { sdk } from '../scalebun/sdk';
import { ENV } from '../config/env';
import { labFetch } from '../services/networkClient';
import { guard } from '../scalebun/integrationErrors';
import { useLabState } from '../hooks/useLab';
import { fakePii } from '../tests/helpers';

const S = sdk.ScaleBun;
// Tiny inline image (a data URI) so image masking can be verified offline.
const IMG = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKklEQVR42mNk+M9Qz0AEYBxVSF+FjKMKGRkZGRgYGBgYGBj+MzAwMDAAAIt1BAHUvHUVAAAAAElFTkSuQmCC' };

export function ReplayPlaygroundScreen() {
  const { runId } = useLabState();
  const pii = fakePii(runId);
  const [text, setText] = useState('');
  const [email, setEmail] = useState(pii.email);
  const [card, setCard] = useState(pii.card);
  const [pw, setPw] = useState(pii.password);
  const [modal, setModal] = useState(false);
  const [taps, setTaps] = useState(0);
  const [longPress, setLongPress] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 2000, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <ScaleBunScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID="screen-ReplayPlayground">
      <H1>Replay Playground</H1>
      <P muted>All sensitive-looking values here are FAKE (example.test email, Stripe test card, synthetic password). Checklist: type in every field, open the modal, scroll both lists, long-press, fast-tap, dismiss keyboard, fire network.</P>

      <Card>
        <H2>Plain text (not an input — visible unless masked by id)</H2>
        <P>Card on file: {pii.card} · SSN {pii.ssn}</P>
        <View nativeID="sdk-test-secret-view" testID="sdk-test-secret-view" style={{ backgroundColor: colors.cardAlt, padding: 8, borderRadius: 6 }}>
          <P>Secret view (nativeID sdk-test-secret-view): {pii.iban}</P>
        </View>
      </Card>

      <Card>
        <H2>Inputs</H2>
        <TextInput placeholder="Free text" placeholderTextColor={colors.muted} value={text} onChangeText={setText} style={inputStyle} testID="input-text" />
        <TextInput placeholder="Email" placeholderTextColor={colors.muted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={inputStyle} testID="input-email" />
        <TextInput placeholder="Card number" placeholderTextColor={colors.muted} value={card} onChangeText={setCard} keyboardType="number-pad" style={inputStyle} testID="input-card" />
        <TextInput placeholder="Password" placeholderTextColor={colors.muted} value={pw} onChangeText={setPw} secureTextEntry style={inputStyle} testID="input-password" />
        <Button small kind="ghost" title="Dismiss keyboard" onPress={() => Keyboard.dismiss()} />
      </Card>

      <Card>
        <H2>Images & animation</H2>
        <Row>
          <Image source={IMG} style={{ width: 64, height: 64, borderRadius: 8 }} accessibilityLabel="fake product image" />
          <Animated.View style={{ width: 40, height: 40, backgroundColor: colors.accent, transform: [{ rotate }] }} />
        </Row>
      </Card>

      <Card>
        <H2>Gestures</H2>
        <Row>
          <Button small title={`Fast tap (${taps})`} onPress={() => setTaps(t => t + 1)} testID="fast-tap" />
          <Pressable onLongPress={() => setLongPress(true)} style={{ padding: 10, backgroundColor: longPress ? colors.ok : colors.cardAlt, borderRadius: 8 }}>
            <Text style={{ color: colors.text }}>{longPress ? 'Long-pressed ✓' : 'Long-press me'}</Text>
          </Pressable>
          <Button small kind="secondary" title="Open modal" onPress={() => setModal(true)} />
        </Row>
        <Row>
          <Button small kind="ghost" title="Add breadcrumb" onPress={() => S.replay.addBreadcrumb({ category: 'user', level: 'info', message: `playground breadcrumb ${runId}` })} />
          <Button small kind="ghost" title="Log line" onPress={() => guard('log', () => S.log('info', `playground log ${runId}`))} />
          <Button small kind="ghost" title="Network call" disabled={!ENV.networkServerUrl} onPress={() => labFetch(ENV.networkServerUrl!, `/delay/400?from=playground&testRunId=${runId}`)} />
          <Button small kind="ghost" title="Network 500" disabled={!ENV.networkServerUrl} onPress={() => labFetch(ENV.networkServerUrl!, '/status/500?from=playground')} />
        </Row>
      </Card>

      <Card>
        <H2>ScaleBunFlatList (horizontal)</H2>
        <ScaleBunFlatList
          horizontal
          data={Array.from({ length: 30 }, (_, i) => ({ id: String(i) }))}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <View style={{ width: 90, height: 60, margin: 4, backgroundColor: colors.cardAlt, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.text }}>Item {item.id}</Text>
            </View>
          )}
        />
      </Card>

      <Card>
        <H2>ScaleBunSectionList</H2>
        <View style={{ height: 220 }}>
          <ScaleBunSectionList
            nestedScrollEnabled
            sections={[
              { title: 'Section A', data: Array.from({ length: 15 }, (_, i) => `A-${i}`) },
              { title: 'Section B', data: Array.from({ length: 15 }, (_, i) => `B-${i}`) },
            ]}
            keyExtractor={i => i}
            renderSectionHeader={({ section }) => <Text style={{ color: colors.accent, fontWeight: '700' }}>{section.title}</Text>}
            renderItem={({ item }) => <Text style={{ color: colors.text, paddingVertical: 4 }}>{item}</Text>}
          />
        </View>
      </Card>

      <Card>
        <H2>Plain RN ScrollView (auto-scroll profile, RPL-009)</H2>
        <PlainScrollProbe />
      </Card>

      <Card>
        <H2>Long content</H2>
        {Array.from({ length: 40 }, (_, i) => (
          <P key={i} muted>
            Long content line {i + 1} — scroll to generate scroll-settle frames.
          </P>
        ))}
      </Card>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' }}>
          <Card style={{ margin: 12 }}>
            <H2>Modal sheet</H2>
            <TextInput placeholder="Modal input (masked)" placeholderTextColor={colors.muted} style={inputStyle} defaultValue={pii.phone} />
            <Button title="Close modal" onPress={() => setModal(false)} />
          </Card>
        </View>
      </Modal>
    </ScaleBunScrollView>
  );
}

/** A plain React Native ScrollView: only reports scroll depth when autoInstrumentScrollViews is on. */
function PlainScrollProbe() {
  return (
    <ScrollView horizontal testID="plain-scrollview">
      {Array.from({ length: 20 }, (_, i) => (
        <View key={i} style={{ width: 80, height: 50, margin: 4, backgroundColor: colors.cardAlt, borderRadius: 6 }}>
          <Text style={{ color: colors.text, padding: 6 }}>plain {i}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const inputStyle = { borderWidth: 1, borderColor: colors.border, borderRadius: 6, color: colors.text, padding: 8 } as const;
