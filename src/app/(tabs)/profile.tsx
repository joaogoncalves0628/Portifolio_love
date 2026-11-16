import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarDays, Heart, LogOut, Pencil, Plus, Sparkles, UsersRound, X } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useMemories } from '../../context/MemoryContext';
import { TabBarBlurTarget } from '../../components/TabBarBlurTarget';
import { uploadMemoryImage } from '../../services/memoriesApi';
import { useTheme } from '../../context/ThemeContext';
import { fonts } from '../../theme/theme';
import { differenceInDays, formatDateForInput, formatPortugueseDate, nextAnniversary, parsePortugueseDate } from '../../utils/dates';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { signOut, token, user } = useAuth();
  const { memories, events, settings, updateCoupleSettings } = useMemories();
  const insets = useSafeAreaInsets();
  const [showEditor, setShowEditor] = useState(false);
  const [personOne, setPersonOne] = useState(settings.personOne);
  const [personTwo, setPersonTwo] = useState(settings.personTwo);
  const [startDate, setStartDate] = useState(formatDateForInput(settings.relationshipStartDate));
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState<'joao' | 'caio' | null>(null);

  const isJoao = user?.username === 'joaolucas';
  const coupleTitle = isJoao ? 'Você e Caio Forini' : 'Você e João Lucas';
  const daysTogether = Math.max(0, differenceInDays(settings.relationshipStartDate));
  const anniversary = useMemo(() => nextAnniversary(settings.relationshipStartDate), [settings.relationshipStartDate]);
  const uniquePlaces = new Set(memories.map((memory) => memory.location.trim()).filter((place) => place && place !== 'Nosso cantinho')).size;
  const favoriteCount = memories.filter((memory) => memory.isFavorite).length;
  const milestones = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const featuredMemory = memories.find((memory) => memory.privatePinned);

  const openEditor = () => {
    setPersonOne(settings.personOne);
    setPersonTwo(settings.personTwo);
    setStartDate(formatDateForInput(settings.relationshipStartDate));
    setShowEditor(true);
  };

  const saveSettings = async () => {
    const isoDate = parsePortugueseDate(startDate);
    if (!personOne.trim() || !personTwo.trim() || !isoDate) {
      Alert.alert('Confira os dados', 'Informe os dois nomes e a data no formato DD/MM/AAAA.');
      return;
    }

    setSaving(true);
    try {
      await updateCoupleSettings({
        personOne: personOne.trim(),
        personTwo: personTwo.trim(),
        relationshipStartDate: isoDate,
        joaoAvatarUrl: settings.joaoAvatarUrl,
        caioAvatarUrl: settings.caioAvatarUrl,
      });
      setShowEditor(false);
    } catch (error) {
      Alert.alert('Não foi possível salvar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const changeAvatar = async (person: 'joao' | 'caio') => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Permita o acesso às fotos para escolher uma foto de perfil.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled) return;

      setUploadingAvatar(person);
      const uploaded = await uploadMemoryImage(result.assets[0], token ?? undefined);
      await updateCoupleSettings({
        ...settings,
        [person === 'joao' ? 'joaoAvatarUrl' : 'caioAvatarUrl']: uploaded.uri,
      });
    } catch (error) {
      Alert.alert('Não foi possível atualizar a foto', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setUploadingAvatar(null);
    }
  };

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      router.replace('/');
    } catch (error) {
      Alert.alert('Sessão encerrada neste aparelho', error instanceof Error ? error.message : 'Não foi possível avisar o servidor.');
      router.replace('/');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <TabBarBlurTarget routeName="profile">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 18, paddingBottom: 120, backgroundColor: colors.background }]}
      >
      <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.avatarRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Alterar foto de João Lucas"
            disabled={uploadingAvatar !== null}
            onPress={() => void changeAvatar('joao')}
            style={[styles.avatar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          >
            {settings.joaoAvatarUrl
              ? <Image source={{ uri: settings.joaoAvatarUrl }} style={styles.avatarImage} />
              : <Text style={[styles.avatarLetter, { color: colors.primary, fontFamily: fonts.jakartaBold }]}>J</Text>}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Alterar foto de Caio Forini"
            disabled={uploadingAvatar !== null}
            onPress={() => void changeAvatar('caio')}
            style={[styles.avatar, styles.avatarSecond, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          >
            {settings.caioAvatarUrl
              ? <Image source={{ uri: settings.caioAvatarUrl }} style={styles.avatarImage} />
              : <Text style={[styles.avatarLetter, { color: colors.primary, fontFamily: fonts.jakartaBold }]}>C</Text>}
          </Pressable>
          <View style={[styles.heartBadge, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
            <Heart size={14} color="#fff" fill="#fff" />
          </View>
        </View>

        <Text style={[styles.avatarHint, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>
          {uploadingAvatar ? 'Enviando foto...' : 'Toque em uma foto para alterá-la'}
        </Text>
        <Text style={[styles.name, { color: colors.text, fontFamily: fonts.playfair }]}>{coupleTitle}</Text>
        <Text style={[styles.tagline, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>“Uma história construída nos dias de verdade.”</Text>
        <Text style={[styles.badge, { color: colors.primary, fontFamily: fonts.jakartaBold }]}>
          Juntos desde {formatPortugueseDate(settings.relationshipStartDate, { day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>

        <Pressable onPress={openEditor} style={[styles.actionButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
          <Pencil size={16} color="#fff" />
          <Text style={[styles.actionText, { color: '#fff', fontFamily: fonts.jakartaBold }]}>Editar Nós Dois</Text>
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        {[
          { value: String(daysTogether), label: 'Dias juntos' },
          { value: String(memories.length), label: 'Memórias publicadas' },
          { value: String(uniquePlaces), label: 'Lugares registrados' },
          { value: String(favoriteCount), label: 'Memórias curtidas' },
        ].map((stat) => (
          <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: fonts.playfair }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.commemorationCard, { backgroundColor: colors.primaryStrong, borderColor: colors.border }]}>
        <View style={styles.sectionHeading}>
          <CalendarDays size={18} color={colors.champagne} />
          <Text style={[styles.commemorationTitle, { color: colors.text, fontFamily: fonts.playfair }]}>Próximo aniversário</Text>
        </View>
        <Text style={[styles.commemorationDate, { color: colors.champagne, fontFamily: fonts.jakartaBold }]}>
          {formatPortugueseDate(anniversary.date, { day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
        <Text style={[styles.commemorationMeta, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>
          Próximo marco de {anniversary.years} {anniversary.years === 1 ? 'ano' : 'anos'} · faltam {anniversary.daysRemaining} dias
        </Text>
      </View>

      {featuredMemory ? (
        <View style={[styles.featuredCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Sparkles size={18} color={colors.champagne} />
          <View style={styles.featuredContent}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: fonts.playfair }]}>Destaque de vocês</Text>
            <Text style={[styles.timelineDetail, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>{featuredMemory.title || featuredMemory.description}</Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.timelineCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.timelineHeader}>
          <Text style={[styles.timelineTitle, { color: colors.text, fontFamily: fonts.playfair }]}>Nossa Jornada</Text>
          <Pressable onPress={() => router.push('/(tabs)/calendar')} hitSlop={8}>
            <Plus size={20} color={colors.primary} />
          </Pressable>
        </View>
        {milestones.length ? milestones.map((milestone, index) => (
          <View key={milestone.id} style={styles.timelineItem}>
            <View style={styles.timelineConnector}>
              <View style={[styles.timelineDot, { backgroundColor: index === 0 ? colors.primary : colors.surfaceAlt, borderColor: colors.primary }]} />
              {index < milestones.length - 1 ? <View style={[styles.timelineLine, { backgroundColor: colors.primary }]} /> : null}
            </View>
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineDate, { color: colors.primary, fontFamily: fonts.jakartaBold }]}>{formatPortugueseDate(milestone.date, { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              <Text style={[styles.timelineEventTitle, { color: colors.text, fontFamily: fonts.jakartaBold }]}>{milestone.title}</Text>
              {milestone.description ? <Text style={[styles.timelineDetail, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>{milestone.description}</Text> : null}
            </View>
          </View>
        )) : (
          <View style={styles.noMilestones}>
            <UsersRound size={22} color={colors.primary} />
            <Text style={[styles.timelineDetail, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>Registrem momentos especiais na aba Datas para montar a jornada de vocês.</Text>
          </View>
        )}
        <Pressable onPress={() => router.push('/(tabs)/calendar')} style={[styles.addMilestoneButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={[styles.addMilestoneText, { color: colors.text, fontFamily: fonts.jakartaBold }]}>+ Registrar um marco na aba Datas</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={loggingOut}
        onPress={() => void handleSignOut()}
        style={[styles.logoutButton, { backgroundColor: colors.surface, borderColor: colors.border, opacity: loggingOut ? 0.6 : 1 }]}
      >
        <LogOut size={17} color={colors.primary} />
        <Text style={[styles.logoutText, { color: colors.primary, fontFamily: fonts.jakartaBold }]}>
          {loggingOut ? 'Encerrando sessão...' : 'Sair da conta'}
        </Text>
      </Pressable>

      <Modal visible={showEditor} transparent animationType="fade" onRequestClose={() => setShowEditor(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontFamily: fonts.playfair }]}>Dados de vocês</Text>
              <Pressable onPress={() => setShowEditor(false)} accessibilityLabel="Fechar">
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <TextInput value={personOne} onChangeText={setPersonOne} placeholder="Seu nome" placeholderTextColor={colors.textMuted} style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]} />
            <TextInput value={personTwo} onChangeText={setPersonTwo} placeholder="Nome da pessoa amada" placeholderTextColor={colors.textMuted} style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]} />
            <TextInput value={startDate} onChangeText={setStartDate} placeholder="Data oficial DD/MM/AAAA" placeholderTextColor={colors.textMuted} keyboardType="numbers-and-punctuation" style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]} />
            <Pressable disabled={saving} onPress={() => void saveSettings()} style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}>
              <Text style={[styles.saveButtonText, { fontFamily: fonts.jakartaBold }]}>{saving ? 'Salvando...' : 'Salvar alterações'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </TabBarBlurTarget>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 18 },
  profileCard: { borderRadius: 28, borderWidth: 1, padding: 18, marginBottom: 18 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 18, position: 'relative' },
  avatar: { width: 82, height: 82, borderRadius: 41, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  avatarSecond: { marginLeft: -16 },
  avatarImage: { width: '100%', height: '100%', borderRadius: 41 },
  avatarLetter: { fontSize: 28 },
  avatarHint: { textAlign: 'center', fontSize: 11, marginTop: -8, marginBottom: 10 },
  heartBadge: { position: 'absolute', width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', bottom: -4, right: '36%', borderWidth: 2 },
  name: { fontSize: 30, textAlign: 'center' },
  tagline: { textAlign: 'center', marginTop: 8, fontStyle: 'italic', fontSize: 14 },
  badge: { textAlign: 'center', marginTop: 14, fontSize: 12 },
  actionButton: { marginTop: 18, borderRadius: 16, paddingVertical: 12, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
  actionText: { fontSize: 14 },
  logoutButton: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  statCard: { width: '48%', borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 12 },
  statValue: { fontSize: 28, marginBottom: 6 },
  statLabel: { fontSize: 12, lineHeight: 18 },
  commemorationCard: { borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 18 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commemorationTitle: { fontSize: 24 },
  commemorationDate: { fontSize: 15, marginTop: 12, textTransform: 'capitalize' },
  commemorationMeta: { fontSize: 13, marginTop: 4 },
  featuredCard: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  featuredContent: { flex: 1 },
  sectionTitle: { fontSize: 20, marginBottom: 4 },
  timelineCard: { borderRadius: 24, borderWidth: 1, padding: 16 },
  timelineHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timelineTitle: { fontSize: 28, marginBottom: 12 },
  timelineItem: { flexDirection: 'row', marginBottom: 10 },
  timelineConnector: { width: 22, alignItems: 'center' },
  timelineDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  timelineLine: { width: 2, flex: 1, marginTop: 4 },
  timelineContent: { flex: 1, marginLeft: 12, paddingBottom: 12 },
  timelineDate: { fontSize: 12, marginBottom: 4 },
  timelineEventTitle: { fontSize: 15, marginBottom: 2 },
  timelineDetail: { fontSize: 12, lineHeight: 18 },
  noMilestones: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  addMilestoneButton: { borderRadius: 16, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  addMilestoneText: { fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 18 },
  modalCard: { borderRadius: 24, borderWidth: 1, padding: 18, gap: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 24 },
  modalInput: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14 },
  saveButton: { borderRadius: 14, padding: 14, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 14 },
});
