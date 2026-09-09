import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JournalTheme, Spacing } from '@/constants/theme';
import { JournalCard } from '@/components/journal/JournalCard';
import { StampBadge } from '@/components/journal/StampBadge';
import { JournalButton } from '@/components/journal/JournalButton';
import {
  ItineraryPlan,
  normalizeItineraryPlan,
  useItineraryStore,
} from '@/stores/use-itinerary-store';
import { ShareService } from '@/services/share-service';

function parsePlanFromParams(id?: string, planData?: string): ItineraryPlan {
  if (id) {
    const existing = useItineraryStore.getState().getPlanById(id);
    if (existing) return existing;
  }

  if (planData) {
    try {
      const parsed = JSON.parse(planData);
      return normalizeItineraryPlan(parsed);
    } catch {
      // fallback
    }
  }

  return normalizeItineraryPlan({
    id: 'demo_plan',
    title: '西湖慢漫游 · 3日春日手账',
    destination: '杭州',
    totalDays: 3,
    estimatedBudget: '¥1,800',
    summary: '慢品江南春色，泛舟西湖杨公堤，龙井村茶山小憩，打卡诗意江南。',
  });
}

export default function ItineraryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; planData?: string }>();
  const { getPlanById, savePlan, toggleNodeVisited, savedPlans } =
    useItineraryStore();

  const existingFromStore = params.id ? getPlanById(params.id) : undefined;
  const [localPlan, setLocalPlan] = useState<ItineraryPlan>(() =>
    parsePlanFromParams(params.id, params.planData),
  );
  const plan = existingFromStore || localPlan;

  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [isSharing, setIsSharing] = useState(false);

  const isSaved = savedPlans.some((p) => p.id === plan.id);

  const handleSave = async () => {
    await savePlan(plan);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    Alert.alert('手账已封存', '行程已成功保存在本地，断网亦可随时查看！');
  };

  const handleShare = async () => {
    setIsSharing(true);
    Haptics.selectionAsync().catch(() => {});
    try {
      let shareUrl: string | undefined;
      try {
        const res = await ShareService.createCloudShare(plan);
        shareUrl = res.shareUrl;
      } catch {
        // 离线态直接调起原生分享
      }
      await ShareService.shareNativeItinerary(plan, shareUrl);
    } finally {
      setIsSharing(false);
    }
  };

  const handleToggleNode = async (dayNum: number, nodeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await toggleNodeVisited(plan.id, dayNum, nodeId);

    // 本地 state 同步更新
    setLocalPlan((prev) => ({
      ...prev,
      days: prev.days.map((d) => {
        if (d.day !== dayNum) return d;
        return {
          ...d,
          nodes: d.nodes.map((n) =>
            n.id === nodeId ? { ...n, visited: !n.visited } : n,
          ),
        };
      }),
    }));
  };

  const currentDay = plan.days[activeDayIndex] || plan.days[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部手账导航栏 */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={JournalTheme.colors.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.navTitleWrap}>
          <Text style={styles.navTitle} numberOfLines={1}>
            {plan.title}
          </Text>
          <Text style={styles.navSubtitle}>手账旅行清单 · 离线可用</Text>
        </View>

        <View style={styles.navActions}>
          <TouchableOpacity
            onPress={handleShare}
            style={styles.navActionBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={isSharing}
          >
            {isSharing ? (
              <ActivityIndicator
                size="small"
                color={JournalTheme.colors.primary}
              />
            ) : (
              <Ionicons
                name="share-social-outline"
                size={22}
                color={JournalTheme.colors.secondary}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            style={styles.navActionBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={JournalTheme.colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 手账封面板 */}
        <JournalCard style={styles.coverCard} variant="warm">
          <View style={styles.coverTopRow}>
            <StampBadge
              label={`${plan.totalDays} 日漫游`}
              color="red"
              size="md"
              rotation={-5}
            />
            <StampBadge
              label={plan.destination}
              color="blue"
              size="md"
              rotation={3}
            />
          </View>

          <Text style={styles.planTitle}>{plan.title}</Text>
          <Text style={styles.planSummary}>{plan.summary}</Text>

          <View style={styles.coverMetaRow}>
            <View style={styles.metaItem}>
              <Ionicons
                name="wallet-outline"
                size={16}
                color={JournalTheme.colors.primary}
              />
              <Text style={styles.metaLabel}>预估开销：</Text>
              <Text style={styles.metaValue}>
                {plan.estimatedBudget || '¥1,800'}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Ionicons
                name="cloud-done-outline"
                size={16}
                color={JournalTheme.colors.accent}
              />
              <Text style={styles.metaLabel}>离线缓存：</Text>
              <Text style={styles.metaValue}>已同步</Text>
            </View>
          </View>
        </JournalCard>

        {/* 每日 Tab 切换条 */}
        <View style={styles.dayTabsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {plan.days.map((d, index) => {
              const isActive = index === activeDayIndex;
              return (
                <TouchableOpacity
                  key={d.day}
                  style={[styles.dayTab, isActive && styles.dayTabActive]}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setActiveDayIndex(index);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dayTabText,
                      isActive && styles.dayTabTextActive,
                    ]}
                  >
                    Day {d.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 当日主题 */}
        <View style={styles.dayThemeHeader}>
          <Text style={styles.dayThemeTitle}>
            Day {currentDay?.day} · {currentDay?.theme}
          </Text>
          <Text style={styles.dayThemeSubtitle}>
            点击印章即可打卡，完成今日打卡手账
          </Text>
        </View>

        {/* 当日时间轴节点 */}
        <View style={styles.timelineContainer}>
          {currentDay?.nodes.map((node, idx) => {
            const isLast = idx === currentDay.nodes.length - 1;
            return (
              <View key={node.id} style={styles.timelineItem}>
                {/* 左侧时间线与圆点 */}
                <View style={styles.timelineAxis}>
                  <View
                    style={[
                      styles.timelineDot,
                      node.visited && styles.timelineDotVisited,
                    ]}
                  >
                    {node.visited && (
                      <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                    )}
                  </View>
                  {!isLast && <View style={styles.timelineLine} />}
                </View>

                {/* 右侧节点手账卡片 */}
                <JournalCard style={styles.nodeCard}>
                  <View style={styles.nodeHeader}>
                    <View style={styles.nodeTimeWrap}>
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={JournalTheme.colors.textSecondary}
                      />
                      <Text style={styles.nodeTime}>{node.time}</Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleToggleNode(currentDay.day, node.id)}
                      activeOpacity={0.7}
                      style={styles.stampActionWrap}
                    >
                      {node.visited ? (
                        <StampBadge
                          label="已打卡"
                          color="red"
                          size="sm"
                          rotation={-6}
                          animated={true}
                        />
                      ) : (
                        <View style={styles.unvisitedBadge}>
                          <Ionicons
                            name="radio-button-off"
                            size={12}
                            color={JournalTheme.colors.textSecondary}
                          />
                          <Text style={styles.unvisitedText}>打卡</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.nodePlaceName}>{node.placeName}</Text>
                  <Text style={styles.nodeDesc}>{node.description}</Text>

                  {node.transport ? (
                    <View style={styles.nodeTransport}>
                      <Ionicons
                        name="navigate-outline"
                        size={12}
                        color={JournalTheme.colors.secondary}
                      />
                      <Text style={styles.transportText}>{node.transport}</Text>
                    </View>
                  ) : null}
                </JournalCard>
              </View>
            );
          })}
        </View>

        {/* 底部操作栏 */}
        <View style={styles.bottomBar}>
          <JournalButton
            title={isSaved ? '已保存在本地手账' : '保存到我的行程'}
            variant="primary"
            size="lg"
            onPress={handleSave}
            icon={
              <Ionicons
                name="bookmark-outline"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
            }
          />

          <JournalButton
            title={isSharing ? '正在生成分享手账...' : '分享与导出行程手账'}
            variant="outlined"
            size="md"
            onPress={handleShare}
            disabled={isSharing}
            icon={
              <Ionicons
                name="share-social-outline"
                size={18}
                color={JournalTheme.colors.primary}
                style={{ marginRight: 6 }}
              />
            }
            style={{ marginTop: Spacing.two }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: JournalTheme.colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: JournalTheme.colors.border,
    backgroundColor: JournalTheme.colors.surface,
  },
  backBtn: {
    padding: Spacing.one,
  },
  navTitleWrap: {
    flex: 1,
    marginHorizontal: Spacing.three,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: JournalTheme.colors.textPrimary,
  },
  navSubtitle: {
    fontSize: 11,
    color: JournalTheme.colors.textSecondary,
    marginTop: 2,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navActionBtn: {
    padding: Spacing.one,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    paddingBottom: Spacing.six,
  },
  coverCard: {
    padding: Spacing.four,
    backgroundColor: '#FFFDF8',
    borderColor: '#E6DC CE',
  },
  coverTopRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.two,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: JournalTheme.colors.textPrimary,
    lineHeight: 28,
  },
  planSummary: {
    fontSize: 13,
    color: JournalTheme.colors.textPrimary,
    lineHeight: 19,
    marginVertical: Spacing.two,
  },
  coverMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: JournalTheme.colors.border,
    borderStyle: 'dashed',
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    color: JournalTheme.colors.textSecondary,
    marginLeft: 4,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: JournalTheme.colors.textPrimary,
  },
  dayTabsWrap: {
    marginVertical: Spacing.three,
  },
  dayTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: JournalTheme.radii.full,
    backgroundColor: JournalTheme.colors.surface,
    borderWidth: 1,
    borderColor: JournalTheme.colors.border,
    marginRight: Spacing.two,
  },
  dayTabActive: {
    backgroundColor: JournalTheme.colors.primary,
    borderColor: JournalTheme.colors.primary,
  },
  dayTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: JournalTheme.colors.textPrimary,
  },
  dayTabTextActive: {
    color: '#FFFFFF',
  },
  dayThemeHeader: {
    marginBottom: Spacing.three,
  },
  dayThemeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: JournalTheme.colors.textPrimary,
  },
  dayThemeSubtitle: {
    fontSize: 12,
    color: JournalTheme.colors.textSecondary,
    marginTop: 2,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: Spacing.three,
  },
  timelineAxis: {
    alignItems: 'center',
    width: 24,
    marginRight: Spacing.two,
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: JournalTheme.colors.surfaceWarm,
    borderWidth: 2,
    borderColor: JournalTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotVisited: {
    backgroundColor: JournalTheme.colors.stampRed,
    borderColor: JournalTheme.colors.stampRed,
  },
  timelineLine: {
    flex: 1,
    width: 1.5,
    backgroundColor: JournalTheme.colors.border,
    marginVertical: 4,
  },
  nodeCard: {
    flex: 1,
    padding: Spacing.three,
  },
  nodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nodeTimeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nodeTime: {
    fontSize: 12,
    fontWeight: '600',
    color: JournalTheme.colors.textSecondary,
    marginLeft: 4,
  },
  stampActionWrap: {
    padding: 2,
  },
  unvisitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: JournalTheme.radii.sm,
    backgroundColor: JournalTheme.colors.background,
    borderWidth: 1,
    borderColor: JournalTheme.colors.border,
    gap: 4,
  },
  unvisitedText: {
    fontSize: 11,
    color: JournalTheme.colors.textSecondary,
  },
  nodePlaceName: {
    fontSize: 16,
    fontWeight: '700',
    color: JournalTheme.colors.textPrimary,
    marginBottom: 4,
  },
  nodeDesc: {
    fontSize: 13,
    color: JournalTheme.colors.textPrimary,
    lineHeight: 18,
  },
  nodeTransport: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: JournalTheme.colors.surfaceWarm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: JournalTheme.radii.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.two,
    gap: 4,
  },
  transportText: {
    fontSize: 11,
    color: JournalTheme.colors.secondary,
  },
  bottomBar: {
    marginTop: Spacing.four,
  },
});
