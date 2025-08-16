import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Animated, 
  Dimensions,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TextInput,
  Modal,
  FlatList,
  Image,
  PanGestureHandler,
  State
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

// Enhanced theme configuration with more engaging colors
const THEMES = {
  light: {
    primary: '#E8B4CB',
    secondary: '#8B9DC3',
    accent1: '#96CEB4',
    accent2: '#FFEAA7',
    accent3: '#FF6B6B',
    accent4: '#4ECDC4',
    background: '#FFFFFF',
    cardBg: 'rgba(0, 0, 0, 0.05)',
    text: '#1a1a2e',
    textSecondary: '#4a4a4a',
    border: 'rgba(0, 0, 0, 0.1)',
    gradient: ['#f8f9fa', '#e9ecef', '#dee2e6']
  },
  dark: {
    primary: '#00D4FF',      // Neon blue
    secondary: '#0099CC',    // Darker blue
    accent1: '#00FF88',      // Neon green
    accent2: '#FF6B35',      // Neon orange
    accent3: '#FF006E',      // Neon pink
    accent4: '#8338EC',      // Neon purple
    background: '#0A0A0A',   // Very dark
    cardBg: 'rgba(255, 255, 255, 0.08)',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    border: 'rgba(255, 255, 255, 0.1)',
    gradient: ['#0A0A0A', '#1a1a2e', '#16213e']
  }
};