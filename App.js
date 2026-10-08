import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

export default function App() {
  const [tagData, setTagData] = useState('Presiona el botón para escanear');
  const [hilera, setHilera] = useState(71);

  useEffect(() => {
    // Inicializar el lector NFC al abrir la app
    NfcManager.start().catch(() => {
      console.warn('NFC no soportado');
    });
  }, []);

  async function readNfc() {
    try {
      setTagData('Leyendo pulsera... Acerque el dispositivo');
      // Activar la tecnología NDEF para leer texto
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      
      if (tag && tag.ndefMessage && tag.ndefMessage.length > 0) {
        const bytePayload = tag.ndefMessage[0].payload;
        const text = Ndef.text.decodePayload(bytePayload);
        setTagData(`Personal leído:\n${text}`);
      } else {
        setTagData('Tarjeta detectada pero sin formato de texto');
      }
    } catch (ex) {
      console.warn(ex);
      setTagData('Lectura cancelada o error al escanear');
    } finally {
      // Apagar el modo de lectura al terminar
      NfcManager.cancelTechnologyRequest();
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌱 Cosecha</Text>
        <Text style={styles.subtitle}>Libreta NFC Cosecha</Text>
      </View>

      <View style={styles.hileraContainer}>
        <Text style={styles.label}>Hilera activa</Text>
        <View style={styles.hileraControl}>
          <TouchableOpacity onPress={() => setHilera(h => Math.max(1, h - 1))} style={styles.btn}>
            <Text style={styles.btnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.hileraText}>Hilera {hilera}</Text>
          <TouchableOpacity onPress={() => setHilera(h => h + 1)} style={styles.btn}>
            <Text style={styles.btnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.scanContainer}>
        <TouchableOpacity style={styles.scanButton} onPress={readNfc}>
          <Text style={styles.scanButtonText}>🔍 Escanear Pulsera NFC</Text>
        </TouchableOpacity>
        
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>{tagData}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', padding: 20 },
  header: { marginTop: 20, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2e7d32' },
  subtitle: { fontSize: 14, color: '#666' },
  hileraContainer: { alignItems: 'center', marginBottom: 20 },
  label: { fontSize: 16, color: '#444', marginBottom: 10 },
  hileraControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f5e9', borderRadius: 20, padding: 5 },
  btn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#c8e6c9', borderRadius: 20 },
  btnText: { fontSize: 22, fontWeight: 'bold', color: '#2e7d32' },
  hileraText: { fontSize: 20, fontWeight: 'bold', marginHorizontal: 20, color: '#1b5e20' },
  scanContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanButton: { backgroundColor: '#2e7d32', paddingVertical: 18, paddingHorizontal: 30, borderRadius: 30, marginBottom: 30, elevation: 3 },
  scanButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  resultBox: { backgroundColor: '#fff', padding: 20, borderRadius: 15, width: '100%', alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#ddd' },
  resultText: { fontSize: 16, color: '#333', textAlign: 'center', fontWeight: '500', lineHeight: 22 }
});
    
