import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from './src/db/database';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}
