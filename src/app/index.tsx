import { Eye, EyeOff, Heart } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fonts } from '../theme/theme';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { signIn, error: serverError } = useAuth();
  const insets = useSafeAreaInsets();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async () => {
    if (!username.trim() || !password) {
      setFormError('Informe seu usuário e sua senha.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await signIn(username, password, rememberMe);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível entrar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24, backgroundColor: colors.background },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.medallion, { borderColor: colors.primaryStrong, shadowColor: colors.primary }]}> 
        <View style={[styles.monogramCircle, { backgroundColor: colors.wine, borderColor: 'rgba(230, 197, 148, 0.9)' }]}> 
          <Text style={[styles.monogram, { color: colors.champagne, fontFamily: fonts.playfair }]}>V</Text>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text, fontFamily: fonts.playfair }]}>Portifolio Love</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>
        O relicário eterno de nós dois.
      </Text>

      <View style={[styles.inputWrap, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}> 
        <View style={styles.iconWrap}> 
          <Heart color={colors.primary} size={16} />
        </View>
        <TextInput
          value={username}
          onChangeText={setUsername}
          style={[styles.input, { color: colors.text, fontFamily: fonts.jakarta }]}
          placeholder="João Lucas ou Caio Forini"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          returnKeyType="next"
        />
      </View>

      <View style={[styles.inputWrap, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}> 
        <TextInput
          value={password}
          onChangeText={setPassword}
          style={[styles.input, { color: colors.text, fontFamily: fonts.jakarta, flex: 1 }]}
          placeholder="Senha de Acesso"
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="current-password"
          returnKeyType="go"
          onSubmitEditing={() => void handleSignIn()}
        />
        <Pressable onPress={() => setShowPassword((value) => !value)} style={styles.eyeButton}>
          {showPassword ? <EyeOff color={colors.textMuted} size={18} /> : <Eye color={colors.textMuted} size={18} />}
        </Pressable>
      </View>

      <View style={styles.rowBetween}> 
        <Pressable onPress={() => setRememberMe((value) => !value)} style={styles.checkRow}>
          <View style={[styles.checkbox, { backgroundColor: rememberMe ? colors.primary : 'transparent', borderColor: colors.border }]}> 
            {rememberMe ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
          <Text style={[styles.checkText, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>Lembrar de mim</Text>
        </Pressable>

        <Text style={[styles.linkText, { color: colors.primary, fontFamily: fonts.jakarta }]}>
          Acesso exclusivo para João Lucas e Caio Forini
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={isSubmitting}
        onPress={() => void handleSignIn()}
        style={({ pressed }) => [
          styles.primaryButton,
          { opacity: isSubmitting ? 0.65 : pressed ? 0.9 : 1, backgroundColor: colors.primaryStrong },
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.primaryButtonText, { fontFamily: fonts.jakartaBold }]}>Entrar no Portifolio Love →</Text>
        )}
      </Pressable>

      {formError || serverError ? (
        <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.primary, fontFamily: fonts.jakarta }]}>
          {formError ?? serverError}
        </Text>
      ) : null}

      <View style={[styles.footerBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}> 
        <Text style={[styles.footerText, { color: colors.textMuted, fontFamily: fonts.jakarta }]}>Acesso privado para duas pessoas</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  medallion: {
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  monogramCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogram: {
    fontSize: 46,
    lineHeight: 46,
  },
  title: {
    fontSize: 42,
    marginTop: 18,
  },
  subtitle: {
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 24,
  },
  inputWrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    marginBottom: 16,
    minHeight: 58,
  },
  iconWrap: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  eyeButton: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  rowBetween: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  checkText: {
    fontSize: 13,
  },
  linkText: {
    fontSize: 12,
    flexShrink: 1,
    textAlign: 'right',
  },
  errorText: {
    width: '100%',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    minHeight: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e05370',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
  },
  footerBadge: {
    marginTop: 26,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 12,
  },
});
