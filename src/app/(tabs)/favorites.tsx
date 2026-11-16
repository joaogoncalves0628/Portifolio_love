import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, LayoutGrid, List, Pencil, Trash2, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { MemoryMediaView } from '../../components/MemoryMediaView';
import { useMemories, type MemoryItem } from '../../context/MemoryContext';
import { useTheme } from '../../context/ThemeContext';
import { fonts } from '../../theme/theme';

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const { memories, toggleFavorite, beginEditingMemory, deleteMemory } = useMemories();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [layout, setLayout] = useState<'list' | 'grid'>('list');
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null);

  const favoriteMemories = memories.filter((memory) => memory.isFavorite);
  const availableWidth = width - 36;
  const cardMediaWidth = layout === 'grid' ? (availableWidth - 16) / 2 : availableWidth;
  const detailMediaWidth = Math.min(width - 60, 520);

  const handleToggleFavorite = async (id: string) => {
    try {
      await toggleFavorite(id);
      setSelectedMemory((current) => current?.id === id ? { ...current, isFavorite: !current.isFavorite } : current);
    } catch (error) {
      Alert.alert('Não foi possível atualizar a curtida', error instanceof Error ? error.message : 'Tente novamente.');
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Excluir publicação?', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          void deleteMemory(id)
            .then(() => setSelectedMemory(null))
            .catch((error: unknown) => {
              Alert.alert('Não foi possível excluir', error instanceof Error ? error.message : 'Tente novamente.');
            });
        },
      },
    ]);
  };

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 18, paddingBottom: 110, backgroundColor: colors.background }]}
      >
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.playfair }]}>Nossos momentos</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>
          As curtidas ficam salvas junto com cada memória.
        </Text>

        <View style={styles.layoutSwitch}>
          <Pressable onPress={() => setLayout('list')} style={[styles.layoutButton, { backgroundColor: layout === 'list' ? colors.primary : colors.surfaceAlt, borderColor: colors.border }]}>
            <List size={16} color={layout === 'list' ? '#fff' : colors.textMuted} />
            <Text style={[styles.layoutText, { color: layout === 'list' ? '#fff' : colors.textMuted, fontFamily: fonts.jakartaBold }]}>Lista</Text>
          </Pressable>
          <Pressable onPress={() => setLayout('grid')} style={[styles.layoutButton, { backgroundColor: layout === 'grid' ? colors.primary : colors.surfaceAlt, borderColor: colors.border }]}>
            <LayoutGrid size={16} color={layout === 'grid' ? '#fff' : colors.textMuted} />
            <Text style={[styles.layoutText, { color: layout === 'grid' ? '#fff' : colors.textMuted, fontFamily: fonts.jakartaBold }]}>Grade</Text>
          </Pressable>
        </View>

        {favoriteMemories.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Heart size={28} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: fonts.playfair }]}>Ainda não há curtidas</Text>
            <Text style={[styles.emptyDescription, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>
              Toque no coração de uma publicação para guardá-la aqui.
            </Text>
          </View>
        ) : (
          <View style={[styles.grid, layout === 'grid' && styles.twoColumns]}>
            {favoriteMemories.map((memory) => (
              <View
                key={memory.id}
                style={[
                  styles.card,
                  layout === 'grid' && styles.gridCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir publicação ${memory.title || memory.description.slice(0, 40)}`}
                  onPress={() => setSelectedMemory(memory)}
                >
                  {memory.images.length > 0 ? (
                    <ScrollView
                      horizontal
                      pagingEnabled
                      nestedScrollEnabled
                      showsHorizontalScrollIndicator={false}
                      style={{ width: cardMediaWidth }}
                    >
                      {memory.images.map((image, index) => (
                        <MemoryMediaView
                          key={`${memory.id}-${index}`}
                          media={image}
                          imageStyle={[styles.cardImage, { width: cardMediaWidth, height: layout === 'grid' ? 140 : 190 }]}
                          videoStyle={[styles.cardImage, { width: cardMediaWidth, height: layout === 'grid' ? 140 : 190 }]}
                        />
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={[styles.textPreview, { backgroundColor: colors.surfaceAlt }]}>
                      <Text numberOfLines={5} style={[styles.cardText, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>{memory.description}</Text>
                    </View>
                  )}
                  <View style={styles.textArea}>
                    <Text style={[styles.labelText, { color: colors.primary, fontFamily: fonts.jakartaBold }]}>
                      {memory.contentType === 'carousel' ? `Carrossel · ${memory.images.length} mídias` : memory.contentType === 'text' ? 'Texto' : 'Foto'}
                    </Text>
                    {memory.title ? <Text style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.playfair }]}>{memory.title}</Text> : null}
                    {memory.images.length > 0 ? (
                      <Text numberOfLines={layout === 'grid' ? 3 : 5} style={[styles.cardText, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>{memory.description}</Text>
                    ) : null}
                  </View>
                </Pressable>
                <View style={styles.bottomRow}>
                  <Text style={[styles.category, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>{memory.date}</Text>
                  <View style={styles.detailActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Excluir publicação"
                      onPress={() => confirmDelete(memory.id)}
                      hitSlop={8}
                    >
                      <Trash2 size={18} color={colors.primary} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Remover curtida"
                      onPress={() => void handleToggleFavorite(memory.id)}
                      hitSlop={8}
                    >
                      <Heart size={20} color={colors.primary} fill={colors.primary} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={selectedMemory !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMemory(null)}
      >
        <View style={[styles.modalBackdrop, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar detalhes"
            onPress={() => setSelectedMemory(null)}
            style={StyleSheet.absoluteFill}
          />
          {selectedMemory ? (
            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailHeader}>
                <View style={styles.detailHeading}>
                  <Text style={[styles.detailAuthor, { color: colors.text, fontFamily: fonts.jakartaBold }]}>{selectedMemory.author}</Text>
                  <Text style={[styles.category, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>{selectedMemory.date}</Text>
                </View>
                <View style={styles.detailActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Excluir publicação"
                    onPress={() => selectedMemory && confirmDelete(selectedMemory.id)}
                    style={[styles.closeButton, { backgroundColor: colors.surfaceAlt }]}
                  >
                    <Trash2 size={17} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Editar publicação"
                    onPress={() => {
                      beginEditingMemory(selectedMemory);
                      setSelectedMemory(null);
                      router.push('/add-memory');
                    }}
                    style={[styles.closeButton, { backgroundColor: colors.surfaceAlt }]}
                  >
                    <Pencil size={17} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Fechar detalhes"
                    onPress={() => setSelectedMemory(null)}
                    style={[styles.closeButton, { backgroundColor: colors.surfaceAlt }]}
                  >
                    <X size={20} color={colors.text} />
                  </Pressable>
                </View>
              </View>
              {selectedMemory.images.length > 0 ? (
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  style={{ width: detailMediaWidth, maxHeight: 300 }}
                >
                  {selectedMemory.images.map((image, index) => (
                    <MemoryMediaView
                      key={`${selectedMemory.id}-detail-${index}`}
                      media={image}
                      resizeMode="contain"
                      imageStyle={[styles.detailImage, { width: detailMediaWidth }]}
                      videoStyle={[styles.detailImage, { width: detailMediaWidth }]}
                    />
                  ))}
                </ScrollView>
              ) : null}
              <ScrollView style={styles.detailTextScroll} showsVerticalScrollIndicator={false}>
                {selectedMemory.title ? <Text style={[styles.detailTitle, { color: colors.text, fontFamily: fonts.playfair }]}>{selectedMemory.title}</Text> : null}
                <Text style={[styles.detailDescription, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>{selectedMemory.description}</Text>
                <View style={styles.detailTags}>
                  {selectedMemory.tags.map((tag) => (
                    <Text key={tag} style={[styles.tag, { backgroundColor: colors.panel, color: colors.primary, fontFamily: fonts.jakarta }]}>{tag}</Text>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 18,
  },
  title: {
    fontSize: 32,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 16,
  },
  layoutSwitch: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    marginBottom: 18,
    gap: 8,
  },
  layoutButton: {
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  layoutText: {
    fontSize: 12,
  },
  grid: {
    gap: 16,
  },
  twoColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gridCard: {
    width: '48%',
    marginBottom: 14,
  },
  cardImage: {
    height: 190,
  },
  textPreview: {
    minHeight: 140,
    padding: 14,
    justifyContent: 'center',
  },
  textArea: {
    padding: 14,
  },
  labelText: {
    fontSize: 11,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 22,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 13,
    lineHeight: 20,
  },
  bottomRow: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  category: {
    fontSize: 11,
  },
  tag: {
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 24,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  detailCard: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    overflow: 'hidden',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailHeading: {
    flex: 1,
    gap: 4,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 8,
  },
  detailAuthor: {
    fontSize: 14,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailImage: {
    height: 300,
  },
  detailTextScroll: {
    flexShrink: 1,
    marginTop: 14,
  },
  detailTitle: {
    fontSize: 24,
    marginBottom: 8,
  },
  detailDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
  detailTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
});
