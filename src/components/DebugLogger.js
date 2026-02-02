import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, BackHandler, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

// Global log store
const logs = [];
const maxLogs = 100;
let listeners = [];

// Override console methods to capture logs
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args) => {
  addLog('LOG', args);
  originalLog(...args);
};

console.error = (...args) => {
  addLog('ERROR', args);
  originalError(...args);
};

console.warn = (...args) => {
  addLog('WARN', args);
  originalWarn(...args);
};

function addLog(level, args) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  
  const log = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toLocaleTimeString(),
    level,
    message
  };
  
  logs.unshift(log);
  if (logs.length > maxLogs) logs.pop();
  
  // Notify listeners
  listeners.forEach(listener => listener(logs));
}

export default function DebugLogger({ visible, onClose }) {
  const [logList, setLogList] = useState([...logs]);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const listener = (newLogs) => setLogList([...newLogs]);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  useEffect(() => {
    if (visible) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        onClose();
        return true; // Prevent default back behavior
      });

      return () => backHandler.remove();
    }
  }, [visible, onClose]);

  if (!visible) return null;

  const filteredLogs = filter === 'ALL' 
    ? logList 
    : logList.filter(log => 
        filter === 'NOTIFICATIONS' 
          ? log.message.includes('[Admin Notifications]') || log.message.includes('notification')
          : log.level === filter
      );

  const getLogColor = (level) => {
    switch (level) {
      case 'ERROR': return '#ff4444';
      case 'WARN': return '#ffaa00';
      default: return '#ffffff';
    }
  };

  const getBorderColor = (log) => {
    // Notifications get blue border
    if (log.message.includes('[Admin Notifications]') || log.message.toLowerCase().includes('notification')) {
      return '#4A90E2';
    }
    // Different colors for different log levels
    switch (log.level) {
      case 'ERROR': return '#ff4444';
      case 'WARN': return '#ffaa00';
      case 'LOG': return '#4CAF50';
      default: return '#888888';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.modal}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + spacing.sm : spacing.xl }]}>
          <Text style={styles.title}>Debug Logs</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TouchableOpacity 
              onPress={() => {
                logs.length = 0;
                setLogList([]);
              }} 
              style={styles.clearIconButton}
            >
              <Ionicons name="trash-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

      <View style={styles.filters}>
        {['ALL', 'NOTIFICATIONS', 'ERROR', 'WARN', 'LOG'].map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.logContainer}>
        {filteredLogs.map(log => (
          <View key={log.id} style={[styles.logEntry, { borderLeftColor: getBorderColor(log) }]}>
            <Text style={styles.timestamp}>{log.timestamp}</Text>
            <Text style={[styles.level, { color: getLogColor(log.level) }]}>
              [{log.level}]
            </Text>
            <Text style={styles.message}>{log.message}</Text>
          </View>
        ))}
        {filteredLogs.length === 0 && (
          <Text style={styles.noLogs}>No logs to display</Text>
        )}
      </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    zIndex: 999999,
    elevation: 999,
  },
  modal: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: '#FF6B35',
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    padding: spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  clearIconButton: {
    padding: spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filters: {
    flexDirection: 'row',
    padding: spacing.sm,
    backgroundColor: '#2a2a2a',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: 15,
    backgroundColor: '#444444',
  },
  filterButtonActive: {
    backgroundColor: '#FF6B35',
  },
  filterText: {
    color: '#cccccc',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  logContainer: {
    flex: 1,
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
    backgroundColor: '#000000',
  },
  logEntry: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    borderLeftWidth: 4,
  },
  timestamp: {
    fontSize: 10,
    color: '#999999',
    marginBottom: 2,
  },
  level: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  message: {
    fontSize: 12,
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  noLogs: {
    color: '#888888',
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: 14,
  },
});
