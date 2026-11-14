import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Página não encontrada' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Esta página não existe.</Text>
        <Link href="/" style={styles.link}>Voltar ao início</Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0507',
    padding: 24,
  },
  title: {
    color: '#fcedef',
    fontSize: 24,
    marginBottom: 12,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  link: {
    color: '#e05370',
    fontSize: 16,
  },
});
