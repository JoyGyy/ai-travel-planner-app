// Jest setup for Expo and React Native
/* eslint-disable no-undef */

// Mock SecureStore
const mockStore = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key) => mockStore[key] || null),
  setItemAsync: jest.fn(async (key, value) => {
    mockStore[key] = String(value);
  }),
  deleteItemAsync: jest.fn(async (key) => {
    delete mockStore[key];
  }),
  isAvailableAsync: jest.fn(async () => true),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => {
  let asyncStore = {};
  return {
    getItem: jest.fn(async (key) => asyncStore[key] || null),
    setItem: jest.fn(async (key, value) => {
      asyncStore[key] = String(value);
    }),
    removeItem: jest.fn(async (key) => {
      delete asyncStore[key];
    }),
    clear: jest.fn(async () => {
      asyncStore = {};
    }),
    getAllKeys: jest.fn(async () => Object.keys(asyncStore)),
  };
});

// Mock Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock Location
jest.mock('expo-location', () => ({
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: {
      latitude: 39.9042,
      longitude: 116.4074,
    },
  })),
  reverseGeocodeAsync: jest.fn(async () => [
    { city: '北京', region: '北京市', country: '中国' },
  ]),
}));
