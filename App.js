import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  // Pestañas disponibles: 'asistencia', 'hileras', 'correas', 'salidas'
  const [pestañaActual, setPestañaActual] = useState('asistencia');

  const [tagData, setTagData] = useState('Presiona el botón para escanear');
  const [hilera, setHilera] = useState(75);
  
  // 4 MEMORIAS SEPARADAS PARA NO MEZCLAR NADA
  const [registrosAsistencia, setRegistrosAsistencia] = useState([]);
  const [registrosHileras, setRegistrosHileras] = useState([]); 
  const [registrosCorreas, setRegistrosCorreas] = useState([]); 
  const [registrosSalidas, setRegistrosSalidas] = useState([]);

  useEffect(() => {
    NfcManager.start().catch(() => console.warn('NFC no soportado'));
    cargarDatosGuardados();
  }, []);

  const cargarDatosGuardados = async () => {
    try {
      const asistencia = await AsyncStorage.getItem('@registros_asistencia');
      if (asistencia !== null) setRegistrosAsistencia(JSON.parse(asistencia));

      const hileras = await AsyncStorage.getItem('@registros_hileras');
      if (hileras !== null) setRegistrosHileras(JSON.parse(hileras));

      const correas = await AsyncStorage.getItem('@registros_correas');
      if (correas !== null) setRegistrosCorreas(JSON.parse(correas));

      const salidas = await AsyncStorage.getItem('@registros_salidas');
      if (salidas !== null) setRegistrosSalidas(JSON.parse(salidas));
    } catch (e) {
      console.warn('Error al cargar datos', e);
    }
  };

  const guardarDatos = async (llave, nuevaLista) => {
    try {
      await AsyncStorage.setItem(llave, JSON.stringify(nuevaLista));
    } catch (e) {
      console.warn('Error al guardar en memoria', e);
    }
  };

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

        const partes = text.split('@');
        const dni = partes[0] || 'Sin DNI';
        const nombre = partes[1] || text; 

        const nuevoRegistro = {
          id: Date.now().toString(),
          dni: dni,
          nombre: nombre,
          hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Guardar dependiendo de la pestaña
        if (pestañaActual === 'asistencia') {
          nuevoRegistro.accion = "Ingreso al campo";
          setRegistrosAsistencia(listaAnterior => {
            const actualizada = [nuevoRegistro, ...listaAnterior];
            guardarDatos('@registros_asistencia', actualizada);
            return actualizada;
          });
        } else if (pestañaActual === 'hileras') {
          nuevoRegistro.hilera = hilera; 
          setRegistrosHileras(listaAnterior => {
            const actualizada = [nuevoRegistro, ...listaAnterior];
            guardarDatos('@registros_hileras', actualizada);
            return actualizada;
          });
        } else if (pestañaActual === 'correas') {
          nuevoRegistro.accion = "Entregó correa"; 
          setRegistrosCorreas(listaAnterior => {
            const actualizada = [nuevoRegistro, ...listaAnterior];
            guardarDatos('@registros_correas', actualizada);
            return actualizada;
          });
        } else if (pestañaActual === 'salidas') {
          // SUPER FUNCIÓN: Si escaneas estando en la pestaña Salidas, 
          // lo marca como retirado y lo saca de Asistencia automáticamente
          nuevoRegistro.accion = "Se retiró (Escaneo directo)";
          setRegistrosSalidas(listaAnterior => {
            const actualizada = [nuevoRegistro, ...listaAnterior];
            guardarDatos('@registros_salidas', actualizada);
            return actualizada;
          });
          // Lo sacamos de asistencia si estaba ahí
          setRegistrosAsistencia(listaAnterior => {
            const actualizada = listaAnterior.filter(r => r.dni !== dni);
            guardarDatos('@registros_asistencia', actualizada);
            return actualizada;
          });
        }

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

  // NUEVA FUNCIÓN: Mover personal de Asistencia a Salidas con el botón
  const marcarSalidaManual = (item) => {
    Alert.alert(
      "Registrar Salida",
      `¿Confirmas que ${item.nombre} se retira del campo?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sí, se retiró", 
          onPress: () => {
            // 1. Lo agregamos a salidas
            const horaSalida = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const registroSalida = { ...item, id: Date.now().toString(), horaSalida: horaSalida, accion: 'Salida manual' };
            
            setRegistrosSalidas(listaAnterior => {
              const actualizada = [registroSalida, ...listaAnterior];
              guardarDatos('@registros_salidas', actualizada);
              return actualizada;
            });

            // 2. Lo quitamos de asistencia
            setRegistrosAsistencia(listaAnterior => {
              const actualizada = listaAnterior.filter(r => r.id !== item.id);
              guardarDatos('@registros_asistencia', actualizada);
              return actualizada;
            });
          }
        }
      ]
    );
  };

  const confirmarEliminar = (id, nombre, estadoActual) => {
    Alert.alert(
      "Eliminar registro por error",
      `¿Estás seguro de eliminar a ${nombre} de esta lista?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive",
          onPress: () => {
            const filtrarYGuardar = (lista, llave, setEstado) => {
              const actualizada = lista.filter(item => item.id !== id);
              guardarDatos(llave, actualizada);
              setEstado(actualizada);
            };

            if (pestañaActual === 'asistencia') filtrarYGuardar(registrosAsistencia, '@registros_asistencia', setRegistrosAsistencia);
            else if (pestañaActual === 'hileras') filtrarYGuardar(registrosHileras, '@registros_hileras', setRegistrosHileras);
            else if (pestañaActual === 'correas') filtrarYGuardar(registrosCorreas, '@registros_correas', setRegistrosCorreas);
            else if (pestañaActual === 'salidas') filtrarYGuardar(registrosSalidas, '@registros_salidas', setRegistrosSalidas);
          }
        }
      ]
    );
  };

  const confirmarBorrarTodo = () => {
    Alert.alert("Limpiar Lista", "¿Deseas borrar toda la lista actual para iniciar de nuevo?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sí, borrar todo", style: "destructive", onPress: () => {
            if (pestañaActual === 'asistencia') { setRegistrosAsistencia([]); guardarDatos('@registros_asistencia', []); }
            else if (pestañaActual === 'hileras') { setRegistrosHileras([]); guardarDatos('@registros_hileras', []); }
            else if (pestañaActual === 'correas') { setRegistrosCorreas([]); guardarDatos('@registros_correas', []); }
            else if (pestañaActual === 'salidas') { setRegistrosSalidas([]); guardarDatos('@registros_salidas', []); }
          }
        }
      ]
    );
  };

  // Configuración de interfaz según la pestaña seleccionada
  let listaActual = []; let colorTema = '#1976d2'; let colorFondoBoton = '#e3f2fd'; let tituloPestaña = '';
  if (pestañaActual === 'asistencia') { listaActual = registrosAsistencia; colorTema = '#1976d2'; colorFondoBoton = '#e3f2fd'; tituloPestaña = '📝 Asistencia (Presentes)'; }
  else if (pestañaActual === 'hileras') { listaActual = registrosHileras; colorTema = '#2e7d32'; colorFondoBoton = '#c8e6c9'; tituloPestaña = '🌱 Control de Hileras'; }
  else if (pestañaActual === 'correas') { listaActual = registrosCorreas; colorTema = '#d84315'; colorFondoBoton = '#ffccbc'; tituloPestaña = '🎒 Control de Correas'; }
  else if (pestañaActual === 'salidas') { listaActual = registrosSalidas; colorTema = '#5e35b1'; colorFondoBoton = '#ede7f6'; tituloPestaña = '🚪 Personal Retirado'; }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colorTema }]}>{tituloPestaña}</Text>
        <Text style={styles.subtitle}>Libreta NFC Cosecha</Text>
      </View>

      {/* Control de hileras SOLO si estamos en la pestaña Hileras */}
      {pestañaActual === 'hileras' && (
        <View style={styles.hileraContainer}>
          <Text style={styles.label}>Hilera activa</Text>
          <View style={[styles.hileraControl, { backgroundColor: '#e8f5e9' }]}>
            <TouchableOpacity onPress={() => setHilera(h => Math.max(1, h - 1))} style={[styles.btn, { backgroundColor: colorFondoBoton }]}>
              <Text style={[styles.btnText, { color: colorTema }]}>-</Text>
            </TouchableOpacity>
            <Text style={[styles.hileraText, { color: colorTema }]}>Hilera {hilera}</Text>
            <TouchableOpacity onPress={() => setHilera(h => h + 1)} style={[styles.btn, { backgroundColor: colorFondoBoton }]}>
              <Text style={[styles.btnText, { color: colorTema }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.scanContainer}>
        <TouchableOpacity style={[styles.scanButton, { backgroundColor: colorTema }]} onPress={readNfc}>
          <Text style={styles.scanButtonText}>🔍 Escanear Pulsera</Text>
        </TouchableOpacity>
        <View style={styles.resultBox}><Text style={styles.resultText}>{tagData}</Text></View>
      </View>

      <View style={styles.listSection}>
        <View style={styles.listHeaderRow}>
          <Text style={[styles.listTitle, { color: colorTema }]}>Registros ({listaActual.length})</Text>
          {listaActual.length > 0 && (
            <TouchableOpacity onPress={confirmarBorrarTodo} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>🗑️ Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.listContainer}>
          {listaActual.map((item) => (
            <View key={item.id} style={styles.listItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.nombre}</Text>
                
                <Text style={styles.itemDetails}>
                  DNI: {item.dni} • 
                  {pestañaActual === 'hileras' ? ` Hilera: ${item.hilera}` : ''}
                  {pestañaActual === 'correas' ? ` Entregó correa` : ''}
                  {pestañaActual === 'asistencia' ? ` Ingreso` : ''}
                  {pestañaActual === 'salidas' ? ` Salida: ${item.horaSalida || item.hora}` : ''}
                </Text>
                <Text style={styles.itemTime}>Hora registro: {item.hora}</Text>
              </View>
              
              <View style={styles.actionButtons}>
                {/* BOTÓN DE SALIDA (Solo aparece en la pestaña Asistencia) */}
                {pestañaActual === 'asistencia' && (
                  <TouchableOpacity style={styles.leaveBtn} onPress={() => marcarSalidaManual(item)}>
                    <Text style={styles.leaveBtnText}>🏃 Salida</Text>
                  </TouchableOpacity>
                )}
                
                {/* BOTÓN ELIMINAR POR ERROR */}
                <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmarEliminar(item.id, item.nombre, pestañaActual)}>
                  <Text style={styles.deleteBtnText}>❌</Text>
                </TouchableOpacity>
              </View>

            </View>
          ))}
        </ScrollView>
      </View>

      {/* BARRA DE NAVEGACIÓN INFERIOR (Ahora con 4 botones) */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.navItem, pestañaActual === 'asistencia' && styles.navItemActivo]} onPress={() => setPestañaActual('asistencia')}>
          <Text style={[styles.navText, pestañaActual === 'asistencia' && { color: '#1976d2', fontWeight: 'bold' }]}>📝 Entrada</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, pestañaActual === 'hileras' && styles.navItemActivo]} onPress={() => setPestañaActual('hileras')}>
          <Text style={[styles.navText, pestañaActual === 'hileras' && { color: '#2e7d32', fontWeight: 'bold' }]}>🌱 Hileras</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, pestañaActual === 'correas' && styles.navItemActivo]} onPress={() => setPestañaActual('correas')}>
          <Text style={[styles.navText, pestañaActual === 'correas' && { color: '#d84315', fontWeight: 'bold' }]}>🎒 Correas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, pestañaActual === 'salidas' && styles.navItemActivo]} onPress={() => setPestañaActual('salidas')}>
          <Text style={[styles.navText, pestañaActual === 'salidas' && { color: '#5e35b1', fontWeight: 'bold' }]}>🚪 Salidas</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { marginTop: 20, marginBottom: 15, paddingHorizontal: 15 },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 13, color: '#666' },
  hileraContainer: { alignItems: 'center', marginBottom: 10, paddingHorizontal: 15 },
  label: { fontSize: 16, color: '#444', marginBottom: 5 },
  hileraControl: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 5 },
  btn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  btnText: { fontSize: 22, fontWeight: 'bold' },
  hileraText: { fontSize: 20, fontWeight: 'bold', marginHorizontal: 20 },
  scanContainer: { alignItems: 'center', marginBottom: 15, paddingHorizontal: 15 },
  scanButton: { paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, marginBottom: 10, elevation: 3 },
  scanButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resultBox: { backgroundColor: '#fff', padding: 12, borderRadius: 10, width: '100%', alignItems: 'center', elevation: 1, borderWidth: 1, borderColor: '#ddd' },
  resultText: { fontSize: 14, color: '#333', textAlign: 'center', fontWeight: '500' },
  listSection: { flex: 1, marginTop: 5, paddingHorizontal: 15 },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  listTitle: { fontSize: 17, fontWeight: 'bold' },
  resetBtn: { backgroundColor: '#ffebee', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ffcdd2' },
  resetBtnText: { fontSize: 12, color: '#c62828', fontWeight: 'bold' },
  listContainer: { flex: 1 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 8, elevation: 1, borderWidth: 1, borderColor: '#eee' },
  itemInfo: { flex: 1, paddingRight: 5 },
  itemName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  itemDetails: { fontSize: 12, color: '#666', marginTop: 3, marginBottom: 1 },
  itemTime: { fontSize: 11, color: '#999', fontWeight: 'bold' },
  actionButtons: { flexDirection: 'row', alignItems: 'center' },
  leaveBtn: { paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#e3f2fd', borderRadius: 8, marginRight: 5, borderWidth: 1, borderColor: '#bbdefb' },
  leaveBtnText: { fontSize: 13, color: '#1976d2', fontWeight: 'bold' },
  deleteBtn: { padding: 10, backgroundColor: '#ffebee', borderRadius: 8 },
  deleteBtnText: { fontSize: 14 },
  bottomNav: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#ddd', paddingBottom: 15, paddingTop: 10 },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 5 },
  navItemActivo: { borderBottomWidth: 3, borderColor: '#ccc' },
  navText: { fontSize: 12, color: '#777', marginTop: 2 }
});
        
