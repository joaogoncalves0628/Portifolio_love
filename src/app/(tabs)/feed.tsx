import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useMemories } from '../../context/MemoryContext';
import { fonts } from '../../theme/theme';
import { CalendarDays, Heart, Plus, MapPin, Pencil, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { MemoryMediaView } from '../../components/MemoryMediaView';

export default function FeedScreen() {
  const { colors } = useTheme();
  const {
    memories,
    notes,
    settings,
    connectionStatus,
    connectionError,
    toggleFavorite,
    addLoveNote,
    beginEditingMemory,
    clearEditingMemory,
    deleteMemory,
  } = useMemories();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [noteDraft, setNoteDraft] = useState('');
  const [sendingNote, setSendingNote] = useState(false);
  const imageWidth = Math.max(220, width - 64);

  const handleSendNote = async () => {
    const content = noteDraft.trim();
    if (!content) {
      return;
    }

    setSendingNote(true);
    try {
      await addLoveNote({ author: settings.personOne, content });
      setNoteDraft('');
    } catch (error) {
      Alert.alert('Bilhete não enviado', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setSendingNote(false);
    }
  };

  const handleFavorite = async (id: string) => {
    try {
      await toggleFavorite(id);
    } catch (error) {
      Alert.alert('Curtida não salva', error instanceof Error ? error.message : 'Tente novamente.');
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Excluir publicação?', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          void deleteMemory(id).catch((error: unknown) => {
            Alert.alert('Não foi possível excluir', error instanceof Error ? error.message : 'Tente novamente.');
          });
        },
      },
    ]);
  };

  return (
    <FlatList
      data={memories}
      keyExtractor={(memory) => memory.id}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: 110, backgroundColor: colors.background },
      ]}
      initialNumToRender={2}
      maxToRenderPerBatch={2}
      windowSize={5}
      removeClippedSubviews={Platform.OS === 'android'}
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <Text style={[styles.eyebrow, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>Nossos capítulos</Text>
            <Text style={[styles.title, { color: colors.text, fontFamily: fonts.playfair }]}>Portifolio Love</Text>
          </View>

          {connectionStatus !== 'connected' && (
            <View style={[styles.connectionNotice, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={[styles.connectionNoticeText, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>
                {connectionStatus === 'loading'
                  ? 'Conectando ao banco...'
                  : connectionStatus === 'local'
                    ? 'Modo local: configure EXPO_PUBLIC_API_URL para conectar ao MySQL.'
                    : `API/MySQL indisponível: ${connectionError ?? 'verifique a configuração do servidor.'}`}
              </Text>
            </View>
          )}

          <Pressable
            onPress={() => {
              clearEditingMemory();
              router.push('/add-memory');
            }}
            style={[styles.newMemoryButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          >
            <Plus size={17} color={colors.primary} />
            <Text style={[styles.newMemoryText, { color: colors.text, fontFamily: fonts.jakartaBold }]}>Publicar texto, foto ou carrossel</Text>
          </Pressable>
        </View>
      }
      ListEmptyComponent={connectionStatus !== 'loading' ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: fonts.playfair }]}>O álbum começa com vocês</Text>
          <Text style={[styles.emptyDescription, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>Publique uma memória, uma foto ou um texto para preencher esta página.</Text>
        </View>
      ) : undefined}
      ListFooterComponent={
        <View>
          <View style={[styles.noteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.noteTitle, { color: colors.text, fontFamily: fonts.playfair }]}>Notas & Bilhetes de Amor</Text>
            {notes.map((note) => (
              <View key={note.id} style={[styles.noteQuote, { backgroundColor: colors.panel, borderColor: colors.border }]}>
                <Text style={[styles.noteText, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>
                  {note.author}: “{note.content}”
                </Text>
              </View>
            ))}
            <View style={[styles.quickNoteInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <TextInput
                value={noteDraft}
                onChangeText={setNoteDraft}
                placeholder="Escreva um bilhete de amor..."
                placeholderTextColor={colors.textMuted}
                maxLength={1000}
                style={[styles.quickNoteText, { color: colors.text, fontFamily: fonts.jakarta }]}
              />
              <Pressable disabled={sendingNote || !noteDraft.trim()} onPress={() => void handleSendNote()} style={[styles.sendButton, { backgroundColor: colors.primary, opacity: sendingNote || !noteDraft.trim() ? 0.5 : 1 }]}>
                <Text style={[styles.sendText, { fontFamily: fonts.jakartaBold }]}>{sendingNote ? 'Enviando...' : 'Enviar'}</Text>
              </Pressable>
            </View>
          </View>

          {memories.length > 0 ? (
            <View style={[styles.endCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <CalendarDays color={colors.champagne} size={22} />
              <Text style={[styles.endText, { color: colors.text, fontFamily: fonts.jakarta }]}>Cada lembrança publicada agora faz parte do álbum de vocês.</Text>
            </View>
          ) : null}
        </View>
      }
      renderItem={({ item: memory }) => (
        <View key={memory.id} style={[styles.memoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <View style={styles.cardHeader}> 
            <View style={styles.authorWrap}> 
              <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt }]} />
              <View>
                <Text style={[styles.author, { color: colors.text, fontFamily: fonts.jakartaBold }]}>{memory.author}</Text>
                <Text style={[styles.metaRow, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>{memory.date}{memory.time ? ` • ${memory.time}` : ''}</Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              <Text style={[styles.location, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>
                <MapPin size={12} color={colors.primary} /> {memory.location}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Editar publicação"
                onPress={() => {
                  beginEditingMemory(memory);
                  router.push('/add-memory');
                }}
                hitSlop={8}
                style={[styles.editButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              >
                <Pencil size={15} color={colors.primary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Excluir publicação"
                onPress={() => confirmDelete(memory.id)}
                hitSlop={8}
                style={[styles.editButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              >
                <Trash2 size={15} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          {memory.images.length > 0 ? (
            <View style={styles.imageWrap}>
              <FlatList
                data={memory.images}
                keyExtractor={(_image, index) => `${memory.id}-${index}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                style={{ width: imageWidth }}
                initialNumToRender={1}
                maxToRenderPerBatch={2}
                windowSize={3}
                removeClippedSubviews={Platform.OS === 'android'}
                renderItem={({ item: image, index }) => (
                  <View key={`${memory.id}-${index}`} style={{ width: imageWidth }}>
                    <MemoryMediaView
                      media={image}
                      imageStyle={[styles.memoryImage, { width: imageWidth }]}
                      videoStyle={[styles.memoryImage, { width: imageWidth }]}
                      deferVideoLoading
                    />
                    {memory.images.length > 1 ? (
                      <Text style={[styles.imageCounter, { color: '#fff', fontFamily: fonts.jakartaBold }]}>
                        {index + 1} / {memory.images.length}
                      </Text>
                    ) : null}
                  </View>
                )}
              />
              <LinearGradient
                colors={['rgba(15,5,7,0.02)', 'rgba(15,5,7,0.25)']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            </View>
          ) : null}

          <Pressable
            onPress={() => void handleFavorite(memory.id)}
            style={[styles.reactionPill, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: colors.border }]}
          >
            <Heart size={15} color={memory.isFavorite ? colors.primary : colors.textMuted} fill={memory.isFavorite ? colors.primary : 'transparent'} />
            <Text style={[styles.reactionText, { color: colors.text, fontFamily: fonts.jakartaBold }]}>
              {memory.isFavorite ? 'Curtido por vocês' : 'Curtir memória'}
            </Text>
          </Pressable>

          {memory.title ? <Text style={[styles.memoryTitle, { color: colors.text, fontFamily: fonts.playfair }]}>{memory.title}</Text> : null}
          <Text style={[styles.memoryDescription, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>{memory.description}</Text>

          <View style={styles.tagRow}>
            {memory.tags.map((tag) => (
              <Text key={tag} style={[styles.tag, { backgroundColor: colors.panel, color: colors.primary, fontFamily: fonts.jakarta }]}>{tag}</Text>
            ))}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 18,
  },
  header: {
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 32,
  },
  newMemoryButton: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newMemoryText: {
    fontSize: 13,
  },
  emptyState: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 24,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 13,
    lineHeight: 20,
  },
  chapterScroller: {
    paddingBottom: 18,
  },
  connectionNotice: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  connectionNoticeText: {
    fontSize: 12,
    lineHeight: 18,
  },
  chapterItem: {
    width: 82,
    alignItems: 'center',
    marginRight: 12,
  },
  chapterImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#e05370',
  },
  chapterAdd: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterAddText: {
    fontSize: 28,
    lineHeight: 28,
  },
  chapterLabel: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
  memoryCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  author: {
    fontSize: 12,
  },
  metaRow: {
    fontSize: 11,
  },
  location: {
    fontSize: 12,
    marginRight: 8,
    flexShrink: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '50%',
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    padding: 4,
  },
  imageWrap: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
  },
  memoryImage: {
    height: 320,
    borderRadius: 20,
  },
  imageCounter: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
  },
  imageBadge: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  imageBadgeText: {
    fontSize: 10,
  },
  reactionPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  reactionText: {
    fontSize: 12,
  },
  memoryTitle: {
    fontSize: 28,
    marginBottom: 8,
  },
  memoryDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  noteCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  noteTitle: {
    fontSize: 24,
    marginBottom: 12,
  },
  noteQuote: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 22,
  },
  quickNoteInput: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quickNoteText: {
    fontSize: 12,
    flex: 1,
    minHeight: 36,
    paddingVertical: 4,
  },
  sendButton: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  sendText: {
    color: '#fff',
    fontSize: 12,
  },
  endCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  endText: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
});
