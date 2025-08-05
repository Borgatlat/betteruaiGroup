import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FloatingAITrainer } from '../components/FloatingAITrainer';

export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workout Complete! 💪</Text>
        <Text style={styles.workoutName}>{params.workoutName}</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={24} color="#00ffff" />
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{formatTime(params.duration || 0)}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="barbell-outline" size={24} color="#00ffff" />
            <Text style={styles.statLabel}>Exercises</Text>
            <Text style={styles.statValue}>{params.exerciseCount || 0}</Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#00ffff" />
            <Text style={styles.statLabel}>Sets Completed</Text>
            <Text style={styles.statValue}>{params.completedSets || 0}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="fitness-outline" size={24} color="#00ffff" />
            <Text style={styles.statLabel}>Total Weight</Text>
            <Text style={styles.statValue}>{params.totalWeight || 0} lbs</Text>
          </View>
        </View>

        <View style={styles.messageContainer}>
          <Text style={styles.message}>Workout saved successfully!</Text>
          <Text style={styles.submessage}>You can view this in your workout logs</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.push('/(tabs)')}
      >
        <Text style={styles.buttonText}>Back to Workouts</Text>
      </TouchableOpacity>

      <FloatingAITrainer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  header: {
    marginTop: 60,
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  workoutName: {
    fontSize: 20,
    color: '#00ffff',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#666',
    fontSize: 14,
    marginTop: 5,
    marginBottom: 5,
  },
  statValue: {
    color: '#00ffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  messageContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  message: {
    color: '#00ffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  submessage: {
    color: '#666',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#00ffff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 