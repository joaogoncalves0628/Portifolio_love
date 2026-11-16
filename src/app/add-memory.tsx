import { router } from 'expo-router';
import { Calendar, Clock3, Heart, Image as ImageIcon, X } from 'lucide-react-native';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useMemories, type MemoryContentType, type MemoryItem, type MemoryMedia } from '../context/MemoryContext';
import { MemoryMediaView } from '../components/MemoryMediaView';
import { isMemoriesApiConfigured, uploadMemoryImage } from '../services/memoriesApi';
import { useTheme } from '../context/ThemeContext';
import { fonts } from '../theme/theme';
import { parsePortugueseDate } from '../utils/dates';

const tagOptions = ['#Viagem', '#NossoCantinho', '#Aniversário', '#JantarRomântico', '#Amor'];
const contentTypes: { value: MemoryContentType; label: string }[] = [
  { value: 'photo', label: 'Foto' },
  { value: 'carousel', label: 'Carrossel' },
  { value: 'text', label: 'Texto' },
];
const resizeOptions = [
  { value: null, label: 'Original' },
  { value: 1920, label: '1920 px' },
  { value: 1280, label: '1280 px' },
] as const;
type ResizeDimension = (typeof resizeOptions)[number]['value'];

type DraftMedia = MemoryMedia & { asset?: ImagePicker.ImagePickerAsset };

export default function AddMemoryScreen() {
  const { editingMemory } = useMemories();
  return <MemoryEditorForm key={editingMemory?.id ?? 'new'} editingMemory={editingMemory} />;
}

function MemoryEditorForm({ editingMemory }: { editingMemory: MemoryItem | null }) {
  const { colors } = useTheme();
  const { token } = useAuth();
  const {
    addMemory,
    updateMemory,
    settings,
    clearEditingMemory,
  } = useMemories();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const defaultAuthor = `Registrado por ${settings.personOne}`;
  const [privatePinned, setPrivatePinned] = useState(editingMemory?.privatePinned ?? true);
  const [isFavorite, setIsFavorite] = useState(editingMemory?.isFavorite ?? false);
  const [author, setAuthor] = useState(editingMemory?.author ?? defaultAuthor);
  const [title, setTitle] = useState(editingMemory?.title ?? '');
  const [description, setDescription] = useState(editingMemory?.description ?? '');
  const [date, setDate] = useState(editingMemory?.date === 'Hoje' ? '' : editingMemory?.date ?? '');
  const [time, setTime] = useState(editingMemory?.time ?? '');
  const [location, setLocation] = useState(editingMemory?.location ?? '');
  const [selectedTags, setSelectedTags] = useState<string[]>(editingMemory?.tags ?? ['#Amor']);
  const [contentType, setContentType] = useState<MemoryContentType>(editingMemory?.contentType ?? 'photo');
  const [selectedMedia, setSelectedMedia] = useState<DraftMedia[]>(
    editingMemory?.images.map((media) => ({ ...media })) ?? [],
  );
  const [resizeDimension, setResizeDimension] = useState<ResizeDimension>(1920);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => {
      if (current.includes(tag)) {
        return current.filter((item) => item !== tag);
      }
      if (current.length >= 10) {
        Alert.alert('Limite de tags', 'Uma publicação pode ter até 10 tags.');
        return current;
      }
      return [...current, tag];
    });
  };

  const pickMedia = async () => {
    const remainingSlots = contentType === 'carousel' ? 10 - selectedMedia.length : 1;
    if (remainingSlots <= 0) {
      Alert.alert('Limite do carrossel', 'Um carrossel pode ter até 10 fotos ou vídeos.');
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Permita o acesso à biblioteca para adicionar fotos e vídeos ao álbum.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: contentType === 'carousel' ? ['images', 'videos'] : ['images'],
        allowsMultipleSelection: contentType === 'carousel',
        selectionLimit: remainingSlots,
        quality: 1,
        base64: !isMemoriesApiConfigured,
      });

      if (!result.canceled) {
        const newMedia = result.assets.map((asset): DraftMedia => ({
          type: asset.type === 'video' || asset.mimeType?.startsWith('video/') ? 'video' : 'image',
          uri: asset.uri,
          asset,
        }));
        setSelectedMedia((current) => {
          if (contentType !== 'carousel') {
            return newMedia.slice(0, 1);
          }
          const uniqueMedia = newMedia.filter((media) => !current.some((item) => item.uri === media.uri));
          return [...current, ...uniqueMedia].slice(0, 10);
        });
      }
    } catch (error) {
      Alert.alert('Não foi possível abrir as fotos', error instanceof Error ? error.message : 'Tente novamente.');
    }
  };

  const addCustomTag = () => {
    const tag = newTag.trim().replace(/^#*/, '');
    if (!tag) {
      return;
    }
    const normalized = `#${tag}`;
    if (normalized.length > 40) {
      Alert.alert('Tag muito longa', 'Cada tag pode ter até 40 caracteres.');
      return;
    }
    if (!selectedTags.includes(normalized)) {
      if (selectedTags.length >= 10) {
        Alert.alert('Limite de tags', 'Uma publicação pode ter até 10 tags.');
        return;
      }
      setSelectedTags((current) => [...current, normalized]);
    }
    setNewTag('');
  };

  const handleSave = async () => {
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    const normalizedAuthor = author.trim();

    if (!normalizedTitle || normalizedTitle.length > 60) {
      Alert.alert('Título obrigatório', 'Informe um título com até 60 caracteres.');
      return;
    }
    if (!parsePortugueseDate(date.trim())) {
      Alert.alert('Data obrigatória', 'Informe uma data válida no formato DD/MM/AAAA.');
      return;
    }
    if (!normalizedAuthor || normalizedAuthor.length > 100) {
      Alert.alert('Confira o autor', 'Informe o autor da publicação com até 100 caracteres.');
      return;
    }
    if (contentType === 'photo' && (selectedMedia.length !== 1 || selectedMedia[0].type !== 'image')) {
      Alert.alert('Escolha uma foto', 'Este post precisa ter uma foto.');
      return;
    }
    if (contentType === 'carousel' && (selectedMedia.length < 2 || selectedMedia.length > 10)) {
      Alert.alert('Escolha as mídias', 'Um carrossel precisa ter pelo menos duas fotos ou vídeos.');
      return;
    }
    if (contentType === 'text' && selectedMedia.length > 0) {
      Alert.alert('Remova as mídias', 'Publicações de texto não podem conter fotos ou vídeos.');
      return;
    }

    setSaving(true);
    try {
      const images = await Promise.all(selectedMedia.map(async (media) => {
        const asset = media.asset;
        if (!asset) {
          return { type: media.type, uri: media.uri };
        }

        const isVideo = media.type === 'video';
        if (isVideo || resizeDimension === null || Math.max(asset.width, asset.height) <= resizeDimension) {
          return uploadMemoryImage(asset, token ?? undefined);
        }

        const scale = resizeDimension / Math.max(asset.width, asset.height);
        const resized = await ImageManipulator.ImageManipulator
          .manipulate(asset.uri, {
            maxWidth: resizeDimension,
            maxHeight: resizeDimension,
          })
          .resize({
            width: Math.round(asset.width * scale),
            height: Math.round(asset.height * scale),
          })
          .renderAsync()
          .then((image) => image.saveAsync({
            format: ImageManipulator.SaveFormat.JPEG,
            compress: 0.82,
            base64: !isMemoriesApiConfigured,
          }));

        return uploadMemoryImage({
          ...asset,
          uri: resized.uri,
          base64: resized.base64,
          mimeType: 'image/jpeg',
          fileName: asset.fileName?.replace(/\.[^.]+$/, '.jpg') ?? `memory-${Date.now()}.jpg`,
          file: undefined,
        }, token ?? undefined);
      }));
      const memory = {
        contentType,
        author: normalizedAuthor,
        location: location.trim() || 'Nosso cantinho',
        date: date.trim(),
        time: time.trim(),
        images,
        title: normalizedTitle,
        description: normalizedDescription,
        tags: selectedTags,
        privatePinned,
        isFavorite,
      };
      if (editingMemory) {
        await updateMemory(editingMemory.id, memory);
      } else {
        const { isFavorite: _isFavorite, ...newMemory } = memory;
        await addMemory(newMemory);
      }
      clearEditingMemory();
      router.back();
    } catch (error) {
      Alert.alert(
        'Não foi possível salvar',
        error instanceof Error ? error.message : 'Verifique sua conexão com a API e o banco MySQL.',
      );
    } finally {
      setSaving(false);
    }
  };

  const closeEditor = () => {
    clearEditingMemory();
    router.back();
  };

  const visibleTags = Array.from(new Set([...tagOptions, ...selectedTags]));
  const mediaPreviewWidth = Math.max(220, width - 36);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24, backgroundColor: colors.background }]}
    >
      <View style={styles.header}> 
        <Pressable onPress={closeEditor} style={[styles.closeButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}> 
          <X size={18} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.playfair }]}>
          {editingMemory ? 'Editar publicação' : 'Nova Memória a Dois'}
        </Text>
        <Pressable disabled={saving} onPress={handleSave} style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}> 
          <Text style={[styles.saveText, { fontFamily: fonts.jakartaBold }]}>
            {saving ? 'Salvando...' : editingMemory ? 'Atualizar' : 'Salvar'}
          </Text>
        </Pressable>
      </View>

      <View style={[styles.mediaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        {selectedMedia.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {selectedMedia.map((media, index) => (
              <View key={`${media.uri}-${index}`} style={[styles.previewSlide, { width: mediaPreviewWidth }]}>
                <MemoryMediaView
                  media={media}
                  imageStyle={styles.previewImage}
                  videoStyle={styles.previewImage}
                  resizeMode="contain"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remover mídia"
                  onPress={() => setSelectedMedia((current) => current.filter((_, mediaIndex) => mediaIndex !== index))}
                  style={[styles.removeMediaButton, { backgroundColor: colors.surface }]}
                >
                  <X size={18} color={colors.text} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.emptyPreview, { backgroundColor: colors.surfaceAlt }]}>
            <ImageIcon size={34} color={colors.primary} />
            <Text style={[styles.emptyPreviewText, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>
              {contentType === 'text' ? 'Esta memória será publicada como texto' : 'Escolha uma ou mais fotos'}
            </Text>
          </View>
        )}
        <View style={[styles.previewBadge, { backgroundColor: 'rgba(15,5,7,0.45)' }]}> 
          <Text style={[styles.previewText, { color: '#fff', fontFamily: fonts.jakartaBold }]}>
            {contentType === 'text'
              ? 'TEXTO'
              : `${selectedMedia.length} ${selectedMedia.length === 1 ? 'MÍDIA' : 'MÍDIAS'}`}
          </Text>
        </View>
        {contentType !== 'text' && (
          <Pressable onPress={() => void pickMedia()} style={[styles.imageButton, { backgroundColor: colors.primary }]}> 
            <ImageIcon size={16} color="#fff" />
            <Text style={[styles.imageButtonText, { color: '#fff', fontFamily: fonts.jakartaBold }]}>
              {contentType === 'photo'
                ? selectedMedia.length ? 'Trocar foto' : 'Selecionar foto'
                : 'Adicionar fotos e vídeos'}
            </Text>
          </Pressable>
        )}
      </View>

        {contentType !== 'text' && selectedMedia.some((media) => media.type === 'image') ? (
          <View style={[styles.resizeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.resizeCopy}>
              <Text style={[styles.label, { color: colors.text, fontFamily: fonts.jakartaBold }]}>Tamanho das fotos</Text>
              <Text style={[styles.resizeHint, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>
                Aplicado às novas fotos; vídeos não são redimensionados.
              </Text>
            </View>
            <View style={styles.resizeOptions}>
              {resizeOptions.map((option) => (
                <Pressable
                  key={option.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: resizeDimension === option.value }}
                  onPress={() => setResizeDimension(option.value)}
                  style={[
                    styles.resizeOption,
                    {
                      backgroundColor: resizeDimension === option.value ? colors.primary : colors.surfaceAlt,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.resizeOptionText, { color: resizeDimension === option.value ? '#fff' : colors.textMuted, fontFamily: fonts.jakartaBold }]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

      <View style={[styles.filterRow, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        {contentTypes.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => {
              setContentType(option.value);
              if (option.value === 'text') {
                setSelectedMedia([]);
              } else if (option.value === 'photo') {
                setSelectedMedia((current) => {
                  const firstImage = current.find((item) => item.type === 'image');
                  return firstImage ? [firstImage] : [];
                });
              }
            }}
            style={[styles.filterChip, { backgroundColor: contentType === option.value ? colors.primary : colors.surfaceAlt, borderColor: colors.border }]}
          >
            <Text style={[styles.filterText, { color: contentType === option.value ? '#fff' : colors.textMuted, fontFamily: fonts.jakartaBold }]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <Text style={[styles.label, { color: colors.text, fontFamily: fonts.jakartaBold }]}>Autor *</Text>
        <TextInput
          value={author}
          onChangeText={setAuthor}
          maxLength={100}
          placeholder="Registrado por João Lucas"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text, fontFamily: fonts.jakarta }]}
        />
      </View>

      <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <Text style={[styles.label, { color: colors.text, fontFamily: fonts.jakartaBold }]}>Título *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={60}
          placeholder="Nosso primeiro vinho na Toscana"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text, fontFamily: fonts.jakarta }]}
        />
        <Text style={[styles.counter, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>{title.length} / 60</Text>
      </View>

      <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <Text style={[styles.label, { color: colors.text, fontFamily: fonts.jakartaBold }]}>Nossa História & Sensações (opcional)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Descreva o momento, o perfume, o brilho do céu e o que ele significou para vocês..."
          placeholderTextColor={colors.textMuted}
          maxLength={5000}
          multiline
          numberOfLines={5}
          style={[styles.textarea, { color: colors.text, fontFamily: fonts.jakarta }]}
        />
        <Text style={[styles.counter, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>{description.length} / 5000</Text>
      </View>

      <View style={styles.rowFields}> 
        <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <View style={styles.iconLabel}> 
            <Calendar size={16} color={colors.primary} />
            <Text style={[styles.label, { color: colors.text, fontFamily: fonts.jakartaBold }]}>Data *</Text>
          </View>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="14/10/2024"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, fontFamily: fonts.jakarta }]}
          />
        </View>

        <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <View style={styles.iconLabel}> 
            <Clock3 size={16} color={colors.primary} />
            <Text style={[styles.label, { color: colors.text, fontFamily: fonts.jakartaBold }]}>Horário (opcional)</Text>
          </View>
          <TextInput
            value={time}
            onChangeText={setTime}
            placeholder="18:45"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, fontFamily: fonts.jakarta }]}
          />
        </View>
      </View>

      <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <Text style={[styles.label, { color: colors.text, fontFamily: fonts.jakartaBold }]}>Local Inesquecível (Opcional)</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Vale dos Vinhedos, RS"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text, fontFamily: fonts.jakarta }]}
        />
      </View>

      <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <Text style={[styles.label, { color: colors.text, fontFamily: fonts.jakartaBold }]}>Tags do Casal</Text>
        <View style={styles.tagWrap}> 
          {visibleTags.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <Pressable
                key={tag}
                onPress={() => toggleTag(tag)}
                style={[styles.tagChip, { backgroundColor: active ? colors.primary : colors.surfaceAlt, borderColor: colors.border }]}
              >
                <Text style={[styles.tagText, { color: active ? '#fff' : colors.primary, fontFamily: fonts.jakartaBold }]}>{tag}</Text>
              </Pressable>
            );
          })}
          <View style={[styles.tagChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}> 
            <TextInput
              value={newTag}
              onChangeText={setNewTag}
              placeholder="+ Nova tag"
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={addCustomTag}
              style={[styles.tagText, { color: colors.primary, fontFamily: fonts.jakartaBold }]}
            />
            <Pressable onPress={addCustomTag}>
              <Text style={[styles.tagText, { color: colors.primary, fontFamily: fonts.jakartaBold }]}>Adicionar</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <View style={styles.switchRow}>
          <View style={styles.switchTextWrap}> 
            <Text style={[styles.label, { color: colors.text, fontFamily: fonts.jakartaBold }]}>Destacar em Nós Dois</Text>
          </View>
          <Switch
            value={privatePinned}
            onValueChange={setPrivatePinned}
            trackColor={{ false: '#5b3d44', true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchTextWrap}>
            <Text style={[styles.label, { color: colors.text, fontFamily: fonts.jakartaBold }]}>Curtida</Text>
            <Text style={[styles.resizeHint, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>
              {isFavorite ? 'Esta publicação aparece em Curtidos.' : 'Esta publicação não está marcada como curtida.'}
            </Text>
          </View>
          <Switch
            value={isFavorite}
            onValueChange={setIsFavorite}
            trackColor={{ false: '#5b3d44', true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <Pressable disabled={saving} onPress={handleSave} style={[styles.ctaButton, { backgroundColor: colors.primary, shadowColor: colors.primary, opacity: saving ? 0.6 : 1 }]}> 
        <Heart size={20} color="#fff" fill="#fff" />
        <Text style={[styles.ctaText, { color: '#fff', fontFamily: fonts.jakartaBold }]}>
          {saving ? 'Salvando...' : editingMemory ? 'Atualizar publicação' : 'Salvar no Álbum'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveText: {
    color: '#fff',
    fontSize: 12,
  },
  mediaCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 18,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 320,
  },
  previewSlide: {
    position: 'relative',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPreview: {
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  emptyPreviewText: {
    fontSize: 13,
    textAlign: 'center',
  },
  previewBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewText: {
    fontSize: 10,
  },
  imageButton: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imageButtonText: {
    fontSize: 12,
  },
  resizeCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  resizeCopy: {
    marginBottom: 12,
  },
  resizeHint: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: -4,
  },
  resizeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  resizeOption: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  resizeOptionText: {
    fontSize: 11,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    marginBottom: 18,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterText: {
    fontSize: 11,
  },
  field: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    marginBottom: 10,
  },
  input: {
    fontSize: 14,
    minHeight: 42,
  },
  textarea: {
    minHeight: 110,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  counter: {
    textAlign: 'right',
    marginTop: 6,
    fontSize: 11,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  dateField: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagText: {
    fontSize: 11,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchTextWrap: {
    flex: 1,
  },
  ctaButton: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  ctaText: {
    fontSize: 15,
  },
});
