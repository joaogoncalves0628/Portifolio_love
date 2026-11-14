import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Clock3, Heart, Plus, Sparkles, X } from 'lucide-react-native';
import { useMemories } from '../../context/MemoryContext';
import { useTheme } from '../../context/ThemeContext';
import { fonts } from '../../theme/theme';
import { daysInMonth, formatDateForInput, formatPortugueseDate, monthDayOffset, nextAnniversary, parsePortugueseDate, startOfWeek, toIsoDate } from '../../utils/dates';

const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const views = ['Mês', 'Semana', 'Linha do Tempo'] as const;
type CalendarView = (typeof views)[number];

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { events, settings, addCoupleEvent } = useMemories();
  const insets = useSafeAreaInsets();
  const today = new Date();
  const todayIso = toIsoDate(today);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [activeView, setActiveView] = useState<CalendarView>('Mês');
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(formatDateForInput(todayIso));
  const [eventTime, setEventTime] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const anniversary = useMemo(() => nextAnniversary(settings.relationshipStartDate), [settings.relationshipStartDate]);
  const days = useMemo(() => {
    if (activeView === 'Semana') {
      const start = startOfWeek(new Date(`${selectedDate}T00:00:00`));
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return { date: toIsoDate(date), day: date.getDate() };
      });
    }

    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const offset = monthDayOffset(year, monthIndex);
    return Array.from({ length: offset + daysInMonth(year, monthIndex) }, (_, index) => {
      if (index < offset) {
        return null;
      }
      const day = index - offset + 1;
      return { date: toIsoDate(new Date(year, monthIndex, day)), day };
    });
  }, [activeView, month, selectedDate]);

  const selectedEvents = events.filter((event) => event.date === selectedDate);
  const upcomingEvent = events.find((event) => event.date >= todayIso);
  const visibleTimeline = activeView === 'Linha do Tempo'
    ? events.filter((event) => event.date.startsWith(toIsoDate(month).slice(0, 7)))
    : selectedEvents;

  const shiftCalendar = (amount: number) => {
    if (activeView === 'Semana') {
      const date = new Date(`${selectedDate}T00:00:00`);
      date.setDate(date.getDate() + amount * 7);
      const next = toIsoDate(date);
      setSelectedDate(next);
      setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      return;
    }
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + amount, 1);
    const targetDay = Math.min(Number(selectedDate.slice(-2)), daysInMonth(nextMonth.getFullYear(), nextMonth.getMonth()));
    setMonth(nextMonth);
    setSelectedDate(toIsoDate(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), targetDay)));
  };

  const goToToday = () => {
    setSelectedDate(todayIso);
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const openEventForm = () => {
    setEventTitle('');
    setEventDate(formatDateForInput(selectedDate));
    setEventTime('');
    setEventDescription('');
    setShowEventForm(true);
  };

  const saveEvent = async () => {
    const date = parsePortugueseDate(eventDate);
    if (!eventTitle.trim() || !date) {
      Alert.alert('Confira os dados', 'Informe o título e a data no formato DD/MM/AAAA.');
      return;
    }
    setSaving(true);
    try {
      await addCoupleEvent({
        title: eventTitle.trim(),
        date,
        time: eventTime.trim(),
        description: eventDescription.trim(),
      });
      setSelectedDate(date);
      setMonth(new Date(`${date}T00:00:00`));
      setActiveView('Mês');
      setShowEventForm(false);
    } catch (error) {
      Alert.alert('Data não salva', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 18, paddingBottom: 120, backgroundColor: colors.background }]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.playfair }]}>Datas a Dois</Text>
        <Pressable onPress={goToToday} style={[styles.todayButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={[styles.todayText, { color: colors.text, fontFamily: fonts.jakartaBold }]}>Hoje</Text>
        </Pressable>
      </View>

      <View style={[styles.segmented, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        {views.map((view) => (
          <Pressable
            key={view}
            onPress={() => setActiveView(view)}
            style={[styles.segmentButton, activeView === view && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.segmentText, { color: activeView === view ? '#fff' : colors.textMuted, fontFamily: fonts.jakartaBold }]}>{view}</Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.monthRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable accessibilityLabel="Período anterior" onPress={() => shiftCalendar(-1)} hitSlop={8}>
          <ChevronLeft size={20} color={colors.textMuted} />
        </Pressable>
        <Text style={[styles.monthText, { color: colors.text, fontFamily: fonts.playfair }]}>
          {activeView === 'Semana'
            ? `Semana de ${formatPortugueseDate(selectedDate, { day: 'numeric', month: 'long' })}`
            : activeView === 'Linha do Tempo'
              ? `Linha do tempo · ${formatPortugueseDate(toIsoDate(month), { month: 'long', year: 'numeric' })}`
              : formatPortugueseDate(toIsoDate(month), { month: 'long', year: 'numeric' })}
        </Text>
        <Pressable accessibilityLabel="Próximo período" onPress={() => shiftCalendar(1)} hitSlop={8}>
          <ChevronRight size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={[styles.highlightCard, { backgroundColor: colors.primaryStrong, borderColor: colors.border }]}>
        <View style={styles.highlightTop}>
          <Heart size={18} color={colors.champagne} />
          <Text style={[styles.highlightLabel, { color: colors.champagne, fontFamily: fonts.jakartaBold }]}>
            Próximo marco: {anniversary.years} {anniversary.years === 1 ? 'ano' : 'anos'}
          </Text>
        </View>
        <Text style={[styles.highlightTitle, { color: colors.text, fontFamily: fonts.playfair }]}>Aniversário de namoro</Text>
        <Text style={[styles.highlightMeta, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>
          {formatPortugueseDate(anniversary.date, { day: 'numeric', month: 'long', year: 'numeric' })} · faltam {anniversary.daysRemaining} dias
        </Text>
      </View>

      {activeView !== 'Linha do Tempo' ? (
        <View style={[styles.calendarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.weekRow}>
            {weekDays.map((day, index) => (
              <Text key={`${day}-${index}`} style={[styles.weekDay, { color: colors.textMuted, fontFamily: fonts.jakartaBold }]}>{day}</Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {days.map((item, index) => item ? (
              <Pressable
                key={item.date}
                onPress={() => {
                  setSelectedDate(item.date);
                  setMonth(new Date(`${item.date}T00:00:00`));
                }}
                style={[
                  styles.dayCell,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                  item.date === selectedDate && { backgroundColor: colors.primary, borderColor: colors.primary },
                  item.date === anniversary.date && item.date !== selectedDate && { borderColor: colors.champagne, borderWidth: 2 },
                ]}
              >
                <Text style={[styles.dayText, { color: item.date === selectedDate ? '#fff' : colors.text, fontFamily: fonts.jakartaBold }]}>{item.day}</Text>
                {events.some((event) => event.date === item.date) ? <View style={[styles.eventDot, { backgroundColor: item.date === selectedDate ? '#fff' : colors.primary }]} /> : null}
              </Pressable>
            ) : (
              <View key={`empty-${index}`} style={styles.dayCellEmpty} />
            ))}
          </View>
        </View>
      ) : null}

      <View style={[styles.selectedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.selectedTitle, { color: colors.text, fontFamily: fonts.playfair }]}>
          {activeView === 'Linha do Tempo' ? 'Datas registradas' : formatPortugueseDate(selectedDate, { day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
        {visibleTimeline.length ? visibleTimeline.map((event) => (
          <Pressable
            key={event.id}
            onPress={() => {
              setSelectedDate(event.date);
              setMonth(new Date(`${event.date}T00:00:00`));
              if (activeView === 'Linha do Tempo') setActiveView('Mês');
            }}
            style={styles.eventItem}
          >
            <Clock3 size={15} color={colors.primary} />
            <View style={styles.eventDescription}>
              <Text style={[styles.eventText, { color: colors.text, fontFamily: fonts.jakartaBold }]}>
                {event.time ? `${event.time} · ` : ''}{event.title}
              </Text>
              {activeView === 'Linha do Tempo' || event.description ? (
                <Text style={[styles.eventSubtext, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>
                  {activeView === 'Linha do Tempo' ? `${formatPortugueseDate(event.date, { day: 'numeric', month: 'short', year: 'numeric' })}${event.description ? ` · ${event.description}` : ''}` : event.description}
                </Text>
              ) : null}
            </View>
          </Pressable>
        )) : (
          <Text style={[styles.noEvents, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>
            {activeView === 'Linha do Tempo' ? 'Nenhuma data registrada neste mês.' : 'Nenhuma data registrada para este dia.'}
          </Text>
        )}
      </View>

      <View style={[styles.nextCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <Sparkles size={18} color={colors.champagne} />
        <Text style={[styles.nextText, { color: colors.text, fontFamily: fonts.jakarta }]}>
          {upcomingEvent
            ? `Próximo: ${upcomingEvent.title} em ${formatPortugueseDate(upcomingEvent.date, { day: 'numeric', month: 'long' })}`
            : 'Ainda não há outros encontros marcados. Registre uma data especial.'}
        </Text>
      </View>

      <View style={[styles.quoteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.quoteMark, { color: colors.champagne }]}>“</Text>
        <Text style={[styles.quoteText, { color: colors.text, fontFamily: fonts.jakarta }]}>Cada momento importante merece um lugar na história de vocês.</Text>
      </View>

      <Pressable onPress={openEventForm} style={[styles.ctaButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
        <Plus size={18} color="#fff" />
        <Text style={[styles.ctaText, { fontFamily: fonts.jakartaBold }]}>Registrar Nova Data a Dois</Text>
      </Pressable>

      <Modal visible={showEventForm} transparent animationType="fade" onRequestClose={() => setShowEventForm(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontFamily: fonts.playfair }]}>Nova data especial</Text>
              <Pressable onPress={() => setShowEventForm(false)} accessibilityLabel="Fechar">
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <TextInput value={eventTitle} onChangeText={setEventTitle} placeholder="O que vamos comemorar?" placeholderTextColor={colors.textMuted} style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]} />
            <TextInput value={eventDate} onChangeText={setEventDate} placeholder="DD/MM/AAAA" placeholderTextColor={colors.textMuted} keyboardType="numbers-and-punctuation" style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]} />
            <TextInput value={eventTime} onChangeText={setEventTime} placeholder="Horário (opcional)" placeholderTextColor={colors.textMuted} style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]} />
            <TextInput value={eventDescription} onChangeText={setEventDescription} placeholder="Detalhes (opcional)" placeholderTextColor={colors.textMuted} multiline style={[styles.modalInput, styles.modalTextarea, { color: colors.text, borderColor: colors.border }]} />
            <Pressable disabled={saving} onPress={() => void saveEvent()} style={[styles.modalSave, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}>
              <Text style={[styles.ctaText, { fontFamily: fonts.jakartaBold }]}>{saving ? 'Salvando...' : 'Salvar data'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 32 },
  todayButton: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  todayText: { fontSize: 12 },
  segmented: { flexDirection: 'row', borderRadius: 999, borderWidth: 1, padding: 4, marginBottom: 18 },
  segmentButton: { flex: 1, borderRadius: 999, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 11 },
  monthRow: { minHeight: 54, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, marginBottom: 16 },
  monthText: { fontSize: 19, textTransform: 'capitalize' },
  highlightCard: { borderRadius: 22, borderWidth: 1, padding: 18, marginBottom: 16 },
  highlightTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  highlightLabel: { fontSize: 12 },
  highlightTitle: { fontSize: 26, marginBottom: 4 },
  highlightMeta: { fontSize: 13 },
  calendarCard: { borderRadius: 24, borderWidth: 1, padding: 14, marginBottom: 16 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  weekDay: { width: '13%', textAlign: 'center', fontSize: 12 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  dayCell: { width: '13%', aspectRatio: 1, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 5 },
  dayCellEmpty: { width: '13%', aspectRatio: 1, marginBottom: 5 },
  dayText: { fontSize: 13 },
  eventDot: { width: 5, height: 5, borderRadius: 3, position: 'absolute', bottom: 4 },
  selectedCard: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 16 },
  selectedTitle: { fontSize: 23, marginBottom: 12, textTransform: 'capitalize' },
  eventItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 12 },
  eventDescription: { flex: 1 },
  eventText: { fontSize: 14 },
  eventSubtext: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  noEvents: { fontSize: 13, lineHeight: 20 },
  nextCard: { borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, marginBottom: 16 },
  nextText: { fontSize: 13, flex: 1, lineHeight: 19 },
  quoteCard: { borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'flex-start', padding: 18, marginBottom: 20 },
  quoteMark: { fontSize: 30, marginRight: 8, lineHeight: 28 },
  quoteText: { flex: 1, fontSize: 15, lineHeight: 22 },
  ctaButton: { borderRadius: 18, paddingVertical: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20, shadowOpacity: 0.28, shadowRadius: 18, elevation: 8 },
  ctaText: { color: '#fff', fontSize: 15, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 18 },
  modalCard: { borderRadius: 24, borderWidth: 1, padding: 18, gap: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 24 },
  modalInput: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14 },
  modalTextarea: { minHeight: 80, textAlignVertical: 'top' },
  modalSave: { borderRadius: 14, padding: 14, alignItems: 'center' },
});
