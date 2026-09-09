import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JournalTheme, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/use-auth-store';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('提示', '请输入用户名和密码');
      return;
    }

    try {
      await login(username.trim(), password);
      Alert.alert('登录成功', `欢迎回来，${username}！`, [
        { text: '开启旅行', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('登录失败', error?.message || '用户名或密码错误');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* 顶部关闭按钮 */}
          <View style={styles.headerBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
            >
              <Ionicons
                name="close"
                size={24}
                color={JournalTheme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* 标题手账卡 */}
          <View style={styles.header}>
            <View style={styles.stampIconContainer}>
              <Ionicons
                name="airplane-outline"
                size={32}
                color={JournalTheme.colors.primary}
              />
            </View>
            <Text style={styles.title}>旅行家手账</Text>
            <Text style={styles.subtitle}>
              登录以同步你的专属 AI 旅行行程与打卡足迹
            </Text>
          </View>

          {/* 输入表单 */}
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>用户名</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={JournalTheme.colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="请输入用户名"
                  placeholderTextColor={JournalTheme.colors.textSecondary}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>密码</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={JournalTheme.colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="请输入密码"
                  placeholderTextColor={JournalTheme.colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={JournalTheme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                isLoading && styles.submitButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>立即登录</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 切换注册 */}
          <View style={styles.switchRow}>
            <Text style={styles.switchTip}>还没有旅行家账号？</Text>
            <TouchableOpacity
              onPress={() => router.replace('/(auth)/register' as any)}
            >
              <Text style={styles.switchLink}>立即注册</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: JournalTheme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingVertical: Spacing.two,
  },
  closeBtn: {
    padding: Spacing.two,
    backgroundColor: JournalTheme.colors.surface,
    borderRadius: JournalTheme.radii.full,
    borderWidth: 1,
    borderColor: JournalTheme.colors.border,
  },
  header: {
    alignItems: 'center',
    marginVertical: Spacing.four,
  },
  stampIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: JournalTheme.colors.surfaceWarm,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: JournalTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: JournalTheme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: JournalTheme.colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.four,
  },
  formCard: {
    backgroundColor: JournalTheme.colors.surface,
    borderRadius: JournalTheme.radii.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: JournalTheme.colors.border,
    ...JournalTheme.shadows.card,
  },
  inputGroup: {
    marginBottom: Spacing.three,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: JournalTheme.colors.textPrimary,
    marginBottom: Spacing.one,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: JournalTheme.colors.background,
    borderRadius: JournalTheme.radii.md,
    borderWidth: 1,
    borderColor: JournalTheme.colors.border,
    paddingHorizontal: Spacing.three,
  },
  inputIcon: {
    marginRight: Spacing.two,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: JournalTheme.colors.textPrimary,
  },
  eyeBtn: {
    padding: Spacing.one,
  },
  submitButton: {
    backgroundColor: JournalTheme.colors.primary,
    borderRadius: JournalTheme.radii.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  switchTip: {
    fontSize: 14,
    color: JournalTheme.colors.textSecondary,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '600',
    color: JournalTheme.colors.primary,
    marginLeft: Spacing.one,
  },
});

