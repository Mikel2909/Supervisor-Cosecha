import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';

export default function App() {
  const [tagData, setTagData] = useState('Presiona el botón para escanear');
  const [hilera, setHilera] = useState(73);
  
  // NUEVO: Esta es la "memoria" que guardará la lista de personal escaneado
  const [registros, setRegistros] = useState([]); 

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
        const status = payload[0];
        const langCodeLen = status & 0x3f;
        const textBytes = payload.slice(1 + langCodeLen);
        const text = textBytes.map(b => String.fromCharCode(b)).join('');
        
        setTagData('¡Lectura exitosa!');

        // Separar los datos que vienen con formato DNI@NOMBRE@...
        const partes = text.split('@');
        const dni = partes[0] || 'Sin DNI';
        const nombre = partes[1] || text; 

        // Crear el nuevo registro con los datos extraídos
        const nuevoRegistro = {
          id: Date.now().toString(),
          dni: dni,
          nombre: nombre,
          hilera: hilera, // Guarda la hilera en la que estaba al momento de escanear
          hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) // Guarda la hora exacta
        };

        // Guardar el nuevo registro al principio de la lista
        setRegistros(listaAnterior => [nuevoRegistro, ...listaAnterior]);

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

      {/* NUEVO: Interfaz para mostrar la lista de registros guardados */}
      <View style={styles.listSection}>
        <Text style={styles.listTitle}>Personal Guardado ({registros.length})</Text>
        <ScrollView style={styles.listContainer}>
          {registros.map((item) => (
            <View key={item.id} style={styles.listItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.nombre}</Text>
                <Text style={styles.itemDetails}>DNI: {item.dni} • Hilera: {item.hilera}</Text>
              </View>
              <Text style={styles.itemTime}>{item.hora}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', padding: 20 },
  header: { marginTop: 20, marginBottom: 15 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2e7d32' },
  subtitle: { fontSize: 14, color: '#666' },
  hileraContainer: { alignItems: 'center', marginBottom: 15 },
  label: { fontSize: 16, color: '#444', marginBottom: 10 },
  hileraControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f5e9', borderRadius: 20, padding: 5 },
  btn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#c8e6c9', borderRadius: 20 },
  btnText: { fontSize: 22, fontWeight: 'bold', color: '#2e7d32' },
  hileraText: { fontSize: 20, fontWeight: 'bold', marginHorizontal: 20, color: '#1b5e20' },
  scanContainer: { alignItems: 'center', marginBottom: 15 },
  scanButton: { backgroundColor: '#2e7d32', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, marginBottom: 10, elevation: 3 },
  scanButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resultBox: { backgroundColor: '#fff', padding: 12, borderRadius: 10, width: '100%', alignItems: 'center', elevation: 1, borderWidth: 1, borderColor: '#ddd' },
  resultText: { fontSize: 14, color: '#333', textAlign: 'center', fontWeight: '500' },
  
  /* ESTILOS DE LA NUEVA LISTA */
  listSection: { flex: 1, marginTop: 10 },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32', marginBottom: 10 },
  listContainer: { flex: 1 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 1, borderWidth: 1, borderColor: '#eee' },
  itemInfo: { flex: 1, paddingRight: 10 },
  itemName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  itemDetails: { fontSize: 13, color: '#666', marginTop: 4 },
  itemTime: { fontSize: 13, color: '#999', fontWeight: 'bold' }
});
        
