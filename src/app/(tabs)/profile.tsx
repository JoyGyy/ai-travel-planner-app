import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JournalTheme, Spacing } from '@/constants/theme';
import { JournalCard } from '@/components/journal/JournalCard';
import { StampBadge } from '@/components/journal/StampBadge';
import { JournalButton } from '@/components/journal/JournalButton';
import {
  AttractionItem,
  AttractionsService,
} from '@/services/attractions-service';
import { useAuthStore } from '@/stores/use-auth-store';
import { ItineraryPlan, useItineraryStore } from '@/stores/use-itinerary-store';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, changePassword } = useAuthStore();
  const { savedPlans, loadSavedPlans, removePlan } = useItineraryStore();

  const [activeTab, setActiveTab] = useState<'itineraries' | 'favorites'>(
    'itineraries',
  );
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoriteAttractions, setFavoriteAttractions] = useState<
    AttractionItem[]
  >([]);
  const [refreshing, setRefreshing] = useState(false);

  // 修改密码相关状态
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const loadProfileData = useCallback(async () => {
    await loadSavedPlans();
    if (user) {
      const [favIds, favItems] = await Promise.all([
        AttractionsService.getFavoriteIds(),
        AttractionsService.getFavoriteAttractions(),
      ]);
      setFavoriteIds(favIds);
      setFavoriteAttractions(favItems);
    } else {
      setFavoriteIds([]);
      setFavoriteAttractions([]);
    }
    setRefreshing(false);
  }, [user, loadSavedPlans]);

  useEffect(() => {
    let active = true;
    loadSavedPlans().then(async () => {
      if (!active) return;
      if (user) {
        const [favIds, favItems] = await Promise.all([
          AttractionsService.getFavoriteIds(),
          AttractionsService.getFavoriteAttractions(),
        ]);
        if (active) {
          setFavoriteIds(favIds);
          setFavoriteAttractions(favItems);
        }
      } else {
        if (active) {
          setFavoriteIds([]);
          setFavoriteAttractions([]);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [user, loadSavedPlans]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadProfileData();
  };

  const handleLogout = () => {
    Alert.alert(
      '退出登录',
      '确定要退出当前旅行家账号吗？本地已保存的离线手账将继续保留。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '退出',
          style: 'destructive',
          onPress: async () => {
            await logout();
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            ).catch(() => {});
          },
        },
      ],
    );
  };

  const handleClearCache = async () => {
    Alert.alert('清理离线缓存', '确定要清理本地缓存的行程数据吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清理',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.clear();
          await loadSavedPlans();
          Alert.alert('清理完成', '本地离线缓存已全部清空');
        },
      },
    ]);
  };

  const handleDeletePlan = (plan: ItineraryPlan) => {
    Alert.alert('删除行程', `确定要删除「${plan.title}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await removePlan(plan.id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
            () => {},
          );
        },
      },
    ]);
  };

  const renderItineraryItem = ({ item }: { item: ItineraryPlan }) => (
    <JournalCard style={styles.itineraryCard}>
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: '/itinerary/[id]' as any,
            params: { id: item.id },
          })
        }
        activeOpacity={0.8}
      >
        <View style={styles.itineraryHeader}>
          <Text style={styles.itineraryTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <TouchableOpacity
            onPress={() => handleDeletePlan(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.deleteBtn}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={JournalTheme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.itineraryBadgeRow}>
          <StampBadge
            label={item.destination || '旅行目的地'}
            color="primary"
            size="sm"
            rotation={-2}
          />
          <StampBadge
            label={`${item.totalDays || item.days.length} 日游`}
            color="blue"
            size="sm"
            rotation={2}
          />
        </View>

        <Text style={styles.itinerarySummary} numberOfLines={2}>
          {item.summary || '暂无摘要'}
        </Text>

        <View style={styles.itineraryFooter}>
          <Text style={styles.itineraryDate}>
            保存于 {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <View style={styles.offlineStatus}>
            <Ionicons
              name="checkmark-circle"
              size={14}
              color={JournalTheme.colors.accent}
            />
            <Text style={styles.offlineText}>离线可用</Text>
          </View>
        </View>
      </TouchableOpacity>
    </JournalCard>
  );

  const handleRemoveFavorite = async (item: AttractionItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFavoriteAttractions((prev) => prev.filter((a) => a.id !== item.id));
    setFavoriteIds((prev) => prev.filter((id) => id !== item.id));
    try {
      await AttractionsService.toggleFavorite(item.id);
    } catch {
      loadProfileData();
    }
  };

  const handleChangePasswordSubmit = async () => {
    if (!oldPassword.trim() || !newPassword.trim()) {
      Alert.alert('提示', '请输入原密码和新密码');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('提示', '新密码至少需要 8 位字符，包含大小写字母与数字');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('提示', '两次输入的新密码不一致');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(oldPassword.trim(), newPassword.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      Alert.alert('修改成功', '登录密码已成功更新！');
      setShowPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      Alert.alert('修改失败', e.message || '原密码错误或网络异常');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const renderFavoriteItem = ({ item }: { item: AttractionItem }) => (
    <JournalCard style={styles.favoriteCard}>
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: '/attraction/[id]' as any,
            params: { id: item.id, itemData: JSON.stringify(item) },
          })
        }
        activeOpacity={0.8}
        style={styles.favoriteRow}
      >
        <Image source={{ uri: item.imageUrl }} style={styles.favoriteImage} />
        <View style={styles.favoriteInfo}>
          <View style={styles.favoriteHeader}>
            <Text style={styles.favoriteName} numberOfLines={1}>
              {item.name}
            </Text>
            <TouchableOpacity
              onPress={() => handleRemoveFavorite(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="heart"
                size={18}
                color={JournalTheme.colors.stampRed}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.favoriteTagRow}>
            <StampBadge
              label={item.city}
              color="blue"
              size="sm"
              rotation={-2}
            />
            <Text style={styles.favoriteCategory}>
              {item.category || '精选景点'}
            </Text>
            <Text style={styles.favoritePrice}>{item.price}</Text>
          </View>

          <Text style={styles.favoriteDesc} numberOfLines={1}>
            {item.description}
          </Text>
        </View>
      </TouchableOpacity>
    </JournalCard>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部标题 */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>旅行家档案</Text>
      </View>

      <FlatList
        data={
          activeTab === 'itineraries'
            ? savedPlans
            : (favoriteAttractions as any)
        }
        keyExtractor={(item) => item.id}
        renderItem={
          activeTab === 'itineraries'
            ? (renderItineraryItem as any)
            : (renderFavoriteItem as any)
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={JournalTheme.colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            {/* 用户卡片 */}
            <JournalCard style={styles.userCard} variant="warm">
              <View style={styles.userRow}>
                <View style={styles.avatar}>
                  <Ionicons
                    name="person"
                    size={32}
                    color={JournalTheme.colors.primary}
                  />
                </View>

                <View style={styles.userInfo}>
                  {user ? (
                    <>
                      <Text style={styles.username}>{user.username}</Text>
                      <View style={styles.userBadgeWrap}>
                        <StampBadge
                          label="手账探索家"
                          color="primary"
                          size="sm"
                          rotation={-3}
                        />
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.username}>未登录旅行家</Text>
                      <Text style={styles.loginHint}>
                        登录以同步多端手账行程与收藏
                      </Text>
                    </>
                  )}
                </View>

                {user ? (
                  <TouchableOpacity
                    onPress={handleLogout}
                    style={styles.logoutBtn}
                  >
                    <Ionicons
                      name="log-out-outline"
                      size={20}
                      color={JournalTheme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                ) : (
                  <JournalButton
                    title="登录 / 注册"
                    size="sm"
                    variant="primary"
                    onPress={() => router.push('/(auth)/login' as any)}
                  />
                )}
              </View>

              {/* 数据指标 */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{savedPlans.length}</Text>
                  <Text style={styles.statLabel}>已存手账</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{favoriteIds.length}</Text>
                  <Text style={styles.statLabel}>收藏景点</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>100%</Text>
                  <Text style={styles.statLabel}>离线可用</Text>
                </View>
              </View>
            </JournalCard>

            {/* 内容切换 Tab */}
            <View style={styles.tabSwitchRow}>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  activeTab === 'itineraries' && styles.tabBtnActive,
                ]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setActiveTab('itineraries');
                }}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === 'itineraries' && styles.tabBtnTextActive,
                  ]}
                >
                  我的手账行程 ({savedPlans.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  activeTab === 'favorites' && styles.tabBtnActive,
                ]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setActiveTab('favorites');
                }}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === 'favorites' && styles.tabBtnTextActive,
                  ]}
                >
                  收藏列表 ({favoriteIds.length})
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={
                activeTab === 'itineraries' ? 'book-outline' : 'heart-outline'
              }
              size={48}
              color={JournalTheme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'itineraries'
                ? '暂无保存的手账行程'
                : '暂无收藏的景点'}
            </Text>
            <Text style={styles.emptyDesc}>
              {activeTab === 'itineraries'
                ? '在【AI规划】中生成行程后，点击“存入手账”即可在此离线查看'
                : '在【发现】中点击心形图标即可收藏感兴趣的目的地'}
            </Text>
            {activeTab === 'itineraries' && (
              <JournalButton
                title="去规划第一份行程"
                variant="outlined"
                size="sm"
                onPress={() => router.push('/(tabs)/chat' as any)}
                style={{ marginTop: Spacing.three }}
              />
            )}
          </View>
        }
        ListFooterComponent={
          <View style={styles.settingsSection}>
            <Text style={styles.settingsTitle}>系统与存储</Text>

            {user && (
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => setShowPasswordModal(true)}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <Ionicons
                    name="key-outline"
                    size={18}
                    color={JournalTheme.colors.textPrimary}
                  />
                  <Text style={styles.settingLabel}>修改登录密码</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={JournalTheme.colors.textSecondary}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleClearCache}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <Ionicons
                  name="trash-bin-outline"
                  size={18}
                  color={JournalTheme.colors.textPrimary}
                />
                <Text style={styles.settingLabel}>清理离线缓存</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={JournalTheme.colors.textSecondary}
              />
            </TouchableOpacity>

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={JournalTheme.colors.textPrimary}
                />
                <Text style={styles.settingLabel}>版本信息</Text>
              </View>
              <Text style={styles.settingValue}>
                AI 旅行手账 v1.0.0 (Expo 57)
              </Text>
            </View>
          </View>
        }
      />

      {/* 修改密码模态窗 */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>修改登录密码</Text>
            <TouchableOpacity
              onPress={() => setShowPasswordModal(false)}
              style={styles.modalCloseBtn}
            >
              <Ionicons
                name="close"
                size={22}
                color={JournalTheme.colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>当前原密码</Text>
              <TextInput
                style={styles.textInput}
                placeholder="请输入当前使用的密码"
                placeholderTextColor={JournalTheme.colors.textSecondary}
                value={oldPassword}
                onChangeText={setOldPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>设置新密码</Text>
              <TextInput
                style={styles.textInput}
                placeholder="至少 8 位，含大小写字母与数字"
                placeholderTextColor={JournalTheme.colors.textSecondary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>确认新密码</Text>
              <TextInput
                style={styles.textInput}
                placeholder="再次输入新密码"
                placeholderTextColor={JournalTheme.colors.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            <JournalButton
              title={isChangingPassword ? '正在更新密码...' : '确认修改'}
              variant="primary"
              size="lg"
              onPress={handleChangePasswordSubmit}
              disabled={isChangingPassword}
              style={{ marginTop: Spacing.four }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: JournalTheme.colors.background,
  },
  headerBar: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: JournalTheme.colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  userCard: {
    marginTop: Spacing.two,
    padding: Spacing.four,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: JournalTheme.colors.surface,
    borderWidth: 2,
    borderColor: JournalTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
    color: JournalTheme.colors.textPrimary,
  },
  loginHint: {
    fontSize: 12,
    color: JournalTheme.colors.textSecondary,
    marginTop: 2,
  },
  userBadgeWrap: {
    marginTop: 4,
  },
  logoutBtn: {
    padding: Spacing.two,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: JournalTheme.colors.borderLight,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: JournalTheme.colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: JournalTheme.colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: JournalTheme.colors.border,
  },
  tabSwitchRow: {
    flexDirection: 'row',
    marginVertical: Spacing.three,
    gap: Spacing.two,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: JournalTheme.radii.md,
    backgroundColor: JournalTheme.colors.surface,
    borderWidth: 1,
    borderColor: JournalTheme.colors.border,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: JournalTheme.colors.surfaceWarm,
    borderColor: JournalTheme.colors.primary,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: JournalTheme.colors.textSecondary,
  },
  tabBtnTextActive: {
    color: JournalTheme.colors.primary,
  },
  itineraryCard: {
    marginBottom: Spacing.three,
  },
  itineraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itineraryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: JournalTheme.colors.textPrimary,
    flex: 1,
    marginRight: Spacing.two,
  },
  deleteBtn: {
    padding: 2,
  },
  itineraryBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: Spacing.two,
  },
  itinerarySummary: {
    fontSize: 13,
    color: JournalTheme.colors.textSecondary,
    lineHeight: 18,
  },
  itineraryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 0.5,
    borderTopColor: JournalTheme.colors.borderLight,
  },
  itineraryDate: {
    fontSize: 11,
    color: JournalTheme.colors.textSecondary,
  },
  offlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  offlineText: {
    fontSize: 11,
    color: JournalTheme.colors.accent,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: JournalTheme.colors.textPrimary,
    marginTop: Spacing.two,
  },
  emptyDesc: {
    fontSize: 12,
    color: JournalTheme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: Spacing.four,
    lineHeight: 18,
  },
  settingsSection: {
    marginTop: Spacing.four,
    backgroundColor: JournalTheme.colors.surface,
    borderRadius: JournalTheme.radii.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: JournalTheme.colors.border,
    ...JournalTheme.shadows.card,
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: JournalTheme.colors.textPrimary,
    marginBottom: Spacing.three,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 0.5,
    borderBottomColor: JournalTheme.colors.borderLight,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  settingLabel: {
    fontSize: 14,
    color: JournalTheme.colors.textPrimary,
  },
  settingValue: {
    fontSize: 12,
    color: JournalTheme.colors.textSecondary,
  },
  favoriteCard: {
    marginBottom: Spacing.three,
    padding: Spacing.three,
  },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteImage: {
    width: 80,
    height: 80,
    borderRadius: JournalTheme.radii.md,
    backgroundColor: JournalTheme.colors.border,
    marginRight: Spacing.three,
  },
  favoriteInfo: {
    flex: 1,
  },
  favoriteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  favoriteName: {
    fontSize: 16,
    fontWeight: '700',
    color: JournalTheme.colors.textPrimary,
    flex: 1,
    marginRight: Spacing.two,
  },
  favoriteTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  favoriteCategory: {
    fontSize: 11,
    color: JournalTheme.colors.textSecondary,
  },
  favoritePrice: {
    fontSize: 12,
    fontWeight: '600',
    color: JournalTheme.colors.primary,
    marginLeft: 'auto',
  },
  favoriteDesc: {
    fontSize: 12,
    color: JournalTheme.colors.textSecondary,
    lineHeight: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: JournalTheme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: JournalTheme.colors.border,
    backgroundColor: JournalTheme.colors.surface,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: JournalTheme.colors.textPrimary,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    padding: Spacing.four,
  },
  inputGroup: {
    marginBottom: Spacing.three,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: JournalTheme.colors.textPrimary,
    marginBottom: 6,
  },
  textInput: {
    height: 46,
    borderRadius: JournalTheme.radii.md,
    backgroundColor: JournalTheme.colors.surface,
    borderWidth: 1,
    borderColor: JournalTheme.colors.border,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
    color: JournalTheme.colors.textPrimary,
  },
});
