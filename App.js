import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';

export default function App() {
  const [tagData, setTagData] = useState('Presiona el botón para escanear');
  const [hilera, setHilera] = useState(71);

  useEffect(() => {
    NfcManager.start().catch(() => {
      console.warn('NFC no soportado');
    });
  }, []);

  async function readNfc() {
    try {
      setTagData('Leyendo pulsera... Acerque la pulsera');
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      
      if (tag && tag.ndefMessage && tag.ndefMessage.length > 0) {
        const payload = tag.ndefMessage[0].payload;
        
        // Decodificación manual robusta para extraer el texto de la pulsera
        const status = payload[0];
        const langCodeLen = status & 0x3f;
        const textBytes = payload.slice(1 + langCodeLen);
        const text = textBytes.map(b => String.fromCharCode(b)).join('');
        
        setTagData(`Personal leído:\n${text}`);
      } else {
        setTagData('Pulsera detectada pero sin datos leíbles');
      }
    } catch (ex) {
      console.warn(ex);
      setTagData('Lectura cancelada o error al escanear');
    } finally {
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
