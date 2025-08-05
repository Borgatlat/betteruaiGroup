import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Dimensions } from 'react-native';
import { TrainerProvider } from '../../context/TrainerContext';

const { height, width } = Dimensions.get('window');
const isIphoneX = Platform.OS === 'ios' && (height >= 812 || width >= 812);

const tabConfig = {
  home: {
    title: 'Home',
    icon: (focused) => focused ? 'home' : 'home-outline'
  },
  workout: {
    title: 'Workout',
    icon: (focused) => focused ? 'barbell' : 'barbell-outline'
  },
  mental: {
    title: 'Mental',
    icon: (focused) => focused ? 'leaf' : 'leaf-outline'
  },
  trainer: {
    title: 'Trainer',
    icon: (focused) => focused ? 'fitness' : 'fitness-outline'
  },
  community: {
    title: 'Community',
    icon: (focused) => focused ? 'people' : 'people-outline'
  },
  run: {
    title: 'Run',
    icon: (focused) => focused ? 'walk' : 'walk-outline'
  }
};

export default function TabLayout() {
  return (
    <TrainerProvider>
      <Tabs
        screenOptions={({ route }) => {
          const config = tabConfig[route.name] || {
            title: route.name,
            icon: (focused) => focused ? 'help-circle' : 'help-circle-outline'
          };

          return {
            title: config.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={config.icon(focused)} size={size} color={color} />
            ),
            tabBarActiveTintColor: '#00ffff',
            tabBarInactiveTintColor: 'gray',
            tabBarStyle: {
              backgroundColor: '#000000',
              borderTopColor: 'rgba(255, 255, 255, 0.05)',
              paddingTop: 5,
              paddingBottom: Platform.OS === 'ios' ? (isIphoneX ? 25 : 5) : 5,
              height: Platform.OS === 'ios' ? (isIphoneX ? 80 : 60) : 60,
              position: 'absolute',
              elevation: 8,
              shadowColor: '#000',
            },
            headerShown: false,
          };
        }}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="workout" />
        <Tabs.Screen name="mental" />
        <Tabs.Screen 
          name="trainer" 
          options={{
            href: null,
          }}
        />
        <Tabs.Screen name="community" />
        <Tabs.Screen name="run" />
        <Tabs.Screen
          name="workout-logs"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="active-workout"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="workout-summary"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="edit-workout"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="create-workout"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="training-plans"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="category-exercises"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
            presentation: 'modal',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="pr"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </TrainerProvider>
  );
} 
