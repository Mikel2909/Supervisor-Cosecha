import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, TextInput, Alert, SafeAreaView, ScrollView } from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';

export default function App() {
  const [pestana, setPestana] = useState('escanear'); // 'hileras', 'escanear', 'personal'
  const [hileraActual, setHileraActual] = useState(110);
  const [personal, setPersonal] = useState([
    { id: '04A7', nombre: 'Juan Alberto', hilera: 110, hora: '07:42' },
    { id: '1F3C', nombre: 'Luis Ángel', hilera: 110, hora: '07:45' },
    { id: '0051', nombre: 'María Quispe', hilera: 111, hora: '08:00' },
    { id: '0068', nombre: 'Pedro Salas', hilera: 112, hora: '08:15' },
  ]);
  const [busqueda, setBusqueda] = useState('');
  const [leyendoNFC, setLeyendoNFC] = useState(false);

  useEffect(() => {
    NfcManager.start().catch(() => {});
  }, []);

  async function escanearPulsera() {
    try {
      setLeyendoNFC(true);
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      const tagId = tag.id || Math.random().toString(36).substring(7);

      anotarPersona(tagId);
    } catch (ex) {
      Alert.alert('Lectura NFC', 'Acerque la pulsera al sensor de su celular.');
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {});
      setLeyendoNFC(false);
    }
  }

  const anotarPersona = (tagId) => {
    const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const existe = personal.find(p => p.id === tagId);

    if (existe) {
      const actualizado = personal.map(p => p.id === tagId ? { ...p, hilera: hileraActual, hora: horaActual } : p);
      setPersonal(actualizado);
      Alert.alert('Anotado', `${existe.nombre} anotado(a) en la hilera ${hileraActual}`);
    } else {
      Alert.prompt(
        'Nuevo Registro',
        `Escribe el nombre para la pulsera #${tagId.substring(0, 4)}:`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Guardar',
            onPress: (nombre) => {
              if (nombre) {
                setPersonal([...personal, { id: tagId, nombre, hilera: hileraActual, hora: horaActual }]);
                Alert.alert('Éxito', `${nombre} asignado(a) a la hilera ${hileraActual}`);
              }
            }
          }
        ]
      );
    }
  };

  const cambiarNombre = (id, nuevoNombre) => {
    setPersonal(personal.map(p => p.id === id ? { ...p, nombre: nuevoNombre } : p));
  };

  const eliminarPersona = (id) => {
    setPersonal(personal.filter(p => p.id !== id));
  };

  const personalFiltrado = personal.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    p.hilera.toString().includes(busqueda)
  );

  const hilerasUnicas = Array.from(new Set(personal.map(p => p.hilera))).sort((a, b) => a - b);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌿 Cosecha</Text>
        <Text style={styles.headerSubtitle}>Libreta NFC Cosecha</Text>
      </View>

      <View style={styles.content}>
        {pestana === 'hileras' && (
          <View style={styles.tabContent}>
            <TextInput 
              style={styles.searchBar} 
              placeholder="🔍 Buscar hilera o persona" 
              value={busqueda} 
              onChangeText={setBusqueda} 
            />
            <ScrollView>
              {hilerasUnicas.map(h => {
                const personasEnHilera = personal.filter(p => p.hilera === h);
                return (
                  <View key={h} style={styles.cardHilera}>
                    <View style={styles.badgeHilera}>
                      <Text style={styles.badgeHileraText}>{h}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.cardTitle}>Hilera {h}</Text>
                      <Text style={styles.cardNames}>
                        {personasEnHilera.map(p => p.nombre).join(', ') || 'Sin personal'}
                      </Text>
                      <Text style={styles.cardCount}>👤 {personasEnHilera.length} persona(s)</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {pestana === 'escanear' && (
          <View style={styles.tabContentCenter}>
            <Text style={styles.sectionLabel}>Hilera activa</Text>
            <View style={styles.selectorHilera}>
              <TouchableOpacity style={styles.btnMenosMas} onPress={() => setHileraActual(Math.max(1, hileraActual - 1))}>
                <Text style={styles.btnMenosMasText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.hileraNumero}>Hilera {hileraActual}</Text>
              <TouchableOpacity style={styles.btnMenosMas} onPress={() => setHileraActual(hileraActual + 1)}>
                <Text style={styles.btnMenosMasText}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.nfcCircle} onPress={escanearPulsera}>
              <Text style={styles.nfcIcon}>📡</Text>
              <Text style={styles.nfcText}>{leyendoNFC ? 'Leyendo...' : 'Acerca la pulsera'}</Text>
              <Text style={styles.nfcSubtext}>Listo para leer</Text>
            </TouchableOpacity>

            <Text style={styles.subtituloSection}>Personal en esta hilera ({personal.filter(p => p.hilera === hileraActual).length}):</Text>
            <FlatList
              data={personal.filter(p => p.hilera === hileraActual)}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.rowPersona}>
                  <Text style={styles.nombrePersona}>👤 {item.nombre}</Text>
                  <Text style={styles.horaPersona}>{item.hora}</Text>
                </View>
              )}
            />
          </View>
        )}

        {pestana === 'personal' && (
          <View style={styles.tabContent}>
            <TextInput 
              style={styles.searchBar} 
              placeholder="🔍 Buscar personal..." 
              value={busqueda} 
              onChangeText={setBusqueda} 
            />
            <FlatList
              data={personalFiltrado}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.cardPersonal}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nombrePersonal}>{item.nombre}</Text>
                    <Text style={styles.subPersonal}>Pulsera #{item.id} • Hilera {item.hilera}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.btnEdit} 
                    onPress={() => {
                      Alert.prompt('Editar Nombre', 'Nuevo nombre:', [
                        { text: 'Cancelar' },
                        { text: 'Guardar', onPress: (val) => val && cambiarNombre(item.id, val) }
                      ]);
                    }}
                  >
                    <Text>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.btnDelete} 
                    onPress={() => eliminarPersona(item.id)}
                  >
                    <Text>🗑️</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        )}
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.navBtn, pestana === 'hileras' && styles.navBtnActive]} onPress={() => setPestana('hileras')}>
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navText}>Hileras</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navBtn, pestana === 'escanear' && styles.navBtnActive]} onPress={() => setPestana('escanear')}>
          <Text style={styles.navIcon}>📡</Text>
          <Text style={styles.navText}>Escanear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navBtn, pestana === 'personal' && styles.navBtnActive]} onPress={() => setPestana('personal')}>
          <Text style={styles.navIcon}>👥</Text>
          <Text style={styles.navText}>Personal</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f5f2', paddingTop: 40 },
  header: { paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: 1, borderColor: '#e0e0e0' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1b4332' },
  headerSubtitle: { fontSize: 13, color: '#555' },
  content: { flex: 1, padding: 15 },
  tabContent: { flex: 1 },
  tabContentCenter: { flex: 1, alignItems: 'center' },
  searchBar: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  cardHilera: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center' },
  badgeHilera: { backgroundColor: '#2d6a4f', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  badgeHileraText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1b4332' },
  cardNames: { fontSize: 14, color: '#444', marginVertical: 2 },
  cardCount: { fontSize: 12, color: '#777' },
  sectionLabel: { fontSize: 14, color: '#555', marginBottom: 5 },
  selectorHilera: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  btnMenosMas: { backgroundColor: '#d8f3dc', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  btnMenosMasText: { fontSize: 22, fontWeight: 'bold', color: '#2d6a4f' },
  hileraNumero: { fontSize: 22, fontWeight: 'bold', marginHorizontal: 20, color: '#1b4332' },
  nfcCircle: { width: 170, height: 170, borderRadius: 85, backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#52b788', marginBottom: 20 },
  nfcIcon: { fontSize: 36, marginBottom: 5 },
  nfcText: { fontSize: 15, fontWeight: 'bold', color: '#1b4332' },
  nfcSubtext: { fontSize: 12, color: '#666' },
  subtituloSection: { alignSelf: 'flex-start', fontSize: 15, fontWeight: 'bold', color: '#1b4332', marginBottom: 10 },
  rowPersona: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', width: '100%', padding: 12, borderRadius: 8, marginBottom: 6 },
  nombrePersona: { fontSize: 15, color: '#333' },
  horaPersona: { fontSize: 13, color: '#777' },
  cardPersonal: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 8, alignItems: 'center' },
  nombrePersonal: { fontSize: 16, fontWeight: 'bold', color: '#1b4332' },
  subPersonal: { fontSize: 13, color: '#666' },
  btnEdit: { padding: 8, marginHorizontal: 5 },
  btnDelete: { padding: 8 },
  bottomNav: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#ddd', paddingVertical: 8 },
  navBtn: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  navBtnActive: { borderTopWidth: 2, borderColor: '#2d6a4f' },
  navIcon: { fontSize: 18 },
  navText: { fontSize: 12, color: '#444', marginTop: 2 }
});
        
