import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Import theme
import { colors, spacing } from '../styles/theme';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import FeedScreen from '../screens/FeedScreen';
import PostDetailsScreen from '../screens/PostDetailsScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Auth context
import { useAuth } from '../context/AuthContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Custom tab bar button for the center "Add" button
function AddButton({ onPress }) {
  return (
    <View style={styles.addButtonContainer}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.addButton}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </LinearGradient>
    </View>
  );
}

// Bottom Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: spacing.xs,
          paddingBottom: Platform.OS === 'ios' ? 28 : spacing.sm,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Feed':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Messages':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'AddPost':
              iconName = 'add';
              break;
            case 'Map':
              iconName = focused ? 'map' : 'map-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Feed" 
        component={FeedScreen}
        options={{ tabBarLabel: 'Feed' }}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesScreen}
        options={{ tabBarLabel: 'Messages' }}
      />
      <Tab.Screen
        name="AddPost"
        component={CreatePostScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => <AddButton />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('PostCreate');
          },
        })}
      />
      <Tab.Screen 
        name="MapTab" 
        component={FeedScreen} // Placeholder - we'll add map later
        options={{ 
          tabBarLabel: 'Map',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// Main Navigator
export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // You could show a splash screen here
    return null;
  }

  return (
    <Stack.Navigator
      initialRouteName={isAuthenticated ? 'MainTabs' : 'Login'}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
        gestureEnabled: true,
      }}
    >
      {/* Auth Screens */}
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen}
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen}
      />

      {/* Main App */}
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabs}
        options={{ gestureEnabled: false }}
      />

      {/* Stack Screens (accessible from tabs) */}
      <Stack.Screen 
        name="PostDetails" 
        component={PostDetailsScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen 
        name="PostCreate" 
        component={CreatePostScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{
          presentation: 'card',
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  addButtonContainer: {
    position: 'absolute',
    top: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
