import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

/** Point at your dev machine when running in Expo Go on a device/simulator. */
const API_BASE = 'http://localhost:4820';

const INK = {
  ink950: '#0a1428',
  ink900: '#101f3c',
  ink800: '#16305a',
  ink700: '#1c3a6b',
  ink500: '#2f5fa8',
  ink400: '#3a6cc0',
  band: '#eef1f6',
  line: '#dfe4ee',
  muted: '#5f6b80',
  ok: '#1c9a5b',
};

interface Doc {
  id: string;
  code: string;
  title: string;
  tier: string;
  status: string;
  parties: { id: string; name: string; signedAt: string | null }[];
}

interface VerifyRecord {
  code: string;
  tier: string;
  status: string;
  chainValid: boolean;
  parties: { name: string; signed: boolean }[];
  events: { id: string; type: string; actor: string; at: string }[];
}

type Tab = 'documents' | 'verify' | 'account';

export default function App() {
  const [tab, setTab] = useState<Tab>('documents');
  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Text style={s.brand}>
          i<Text style={s.brandS}>S</Text>igned.it
        </Text>
      </View>

      <View style={s.body}>
        {tab === 'documents' && <Documents />}
        {tab === 'verify' && <Verify />}
        {tab === 'account' && <Account />}
      </View>

      <View style={s.tabbar}>
        {(['documents', 'verify', 'account'] as Tab[]).map((t) => (
          <Pressable key={t} style={s.tab} onPress={() => setTab(t)}>
            <Text style={[s.tabLabel, tab === t && s.tabActive]}>
              {t === 'documents' ? 'Documents' : t === 'verify' ? 'Verify' : 'Account'}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

function Documents() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setRefreshing(true);
    fetch(`${API_BASE}/api/documents`)
      .then((r) => r.json())
      .then((d: Doc[]) => {
        setDocs(d);
        setError('');
      })
      .catch(() => setError('Cannot reach the API — set API_BASE to your dev machine.'))
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(load, [load]);

  return (
    <FlatList
      data={docs}
      keyExtractor={(d) => d.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      ListHeaderComponent={<Text style={s.h1}>Your documents</Text>}
      ListEmptyComponent={<Text style={s.muted}>{error || 'No documents yet.'}</Text>}
      renderItem={({ item }) => (
        <View style={s.card}>
          <Text style={s.cardTitle}>{item.title}</Text>
          <View style={s.row}>
            <Text style={[s.badge, badgeFor(item.status)]}>{item.status.replace(/_/g, ' ')}</Text>
            <Text style={s.metaText}>
              {item.tier} · {item.parties.filter((p) => p.signedAt).length}/{item.parties.length} signed · {item.code}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

function Verify() {
  const [code, setCode] = useState('');
  const [rec, setRec] = useState<VerifyRecord | null>(null);
  const [error, setError] = useState('');

  function go() {
    setError('');
    setRec(null);
    fetch(`${API_BASE}/api/verify/${code.trim()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('Unknown verification code');
        return r.json();
      })
      .then(setRec)
      .catch((e: Error) => setError(e.message));
  }

  return (
    <View>
      <Text style={s.h1}>Verify a document</Text>
      <Text style={s.muted}>Scan the QR on the paper, or type the code printed under it.</Text>
      <View style={[s.row, { marginTop: 14 }]}>
        <TextInput
          style={s.input}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="8F3K-29QT"
          value={code}
          onChangeText={setCode}
        />
        <Pressable style={s.btn} onPress={go}>
          <Text style={s.btnLabel}>Verify</Text>
        </Pressable>
      </View>

      {!!error && <Text style={[s.muted, { marginTop: 16 }]}>{error}</Text>}

      {rec && (
        <View style={{ marginTop: 18 }}>
          <View style={s.verifyHero}>
            <Text style={s.verifyLabel}>DOCUMENT VERIFICATION</Text>
            <Text style={s.verifyCode}>#{rec.code}</Text>
            <Text style={{ color: rec.chainValid ? '#7ee2a8' : '#ff8f8f', marginTop: 6, fontWeight: '600' }}>
              {rec.chainValid ? '✓ evidence chain intact' : '✗ evidence chain broken'}
            </Text>
          </View>
          {rec.events.map((e) => (
            <View key={e.id} style={s.tlItem}>
              <View style={s.tlDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.tlTitle}>{e.type.replace(/_/g, ' ')}</Text>
                <Text style={s.metaText}>
                  {e.actor} · {new Date(e.at).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const SERVICES: { name: string; note: string }[] = [
  { name: 'Profile & identity', note: 'Social login, assurance level, visual signature' },
  { name: 'Payment', note: 'Pay-per-use basket, methods, invoices' },
  { name: 'Address book', note: 'Counterparties, delivery addresses, identity status' },
  { name: 'AI document generation', note: 'Draft a contract from plain words — per contract' },
  { name: 'Video sessions', note: 'Attorney-supervised signing, recorded & sealed' },
];

function Account() {
  return (
    <View>
      <Text style={s.h1}>Account</Text>
      <Text style={s.muted}>
        Sign in with Google, Apple or Microsoft arrives with the identity backend. This build talks
        to the dev API anonymously.
      </Text>
      {SERVICES.map((it) => (
        <View key={it.name} style={s.card}>
          <View style={[s.row, { marginTop: 0, justifyContent: 'space-between' }]}>
            <Text style={s.cardTitle}>{it.name}</Text>
            <Text style={[s.badge, { backgroundColor: '#eef1f6', color: INK.ink700 }]}>SOON</Text>
          </View>
          <Text style={[s.metaText, { marginTop: 4 }]}>{it.note}</Text>
        </View>
      ))}
    </View>
  );
}

function badgeFor(status: string) {
  switch (status) {
    case 'signed':
      return { backgroundColor: '#e2f4ea', color: '#1c7a4b' };
    case 'dispatched':
      return { backgroundColor: '#e5edfb', color: INK.ink500 };
    case 'delivered':
      return { backgroundColor: INK.ink800, color: '#fff' };
    default:
      return { backgroundColor: '#fdf1de', color: '#92600a' };
  }
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: INK.band },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: INK.line,
  },
  brand: { fontSize: 18, fontWeight: '700', letterSpacing: 1, color: INK.ink800 },
  brandS: { fontStyle: 'italic', color: '#191919' },
  body: { flex: 1, padding: 20 },
  h1: { fontSize: 21, fontWeight: '700', color: INK.ink900, marginBottom: 8 },
  muted: { color: INK.muted, fontSize: 13.5, lineHeight: 20 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: INK.line,
    borderRadius: 10,
    padding: 16,
    marginTop: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: INK.ink900 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: INK.muted },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: INK.line,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    letterSpacing: 2,
  },
  btn: { backgroundColor: INK.ink700, borderRadius: 8, paddingHorizontal: 18, justifyContent: 'center' },
  btnLabel: { color: '#fff', fontWeight: '600' },
  verifyHero: { backgroundColor: INK.ink700, borderRadius: 12, padding: 18 },
  verifyLabel: { color: '#9db9e8', fontSize: 10, letterSpacing: 2.5 },
  verifyCode: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: 2, marginTop: 4 },
  tlItem: { flexDirection: 'row', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#e6eaf2' },
  tlDot: { width: 10, height: 10, borderRadius: 2, backgroundColor: INK.ink400, marginTop: 5 },
  tlTitle: { fontSize: 13.5, fontWeight: '600', color: INK.ink900 },
  tabbar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: INK.line,
    paddingBottom: 4,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabLabel: { fontSize: 12.5, fontWeight: '600', color: INK.muted },
  tabActive: { color: INK.ink500 },
});
