import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JournalTheme, Spacing } from '@/constants/theme';
import { JournalCard } from '@/components/journal/JournalCard';
import { StampBadge } from '@/components/journal/StampBadge';
import { JournalButton } from '@/components/journal/JournalButton';
import { WeatherData, WeatherService } from '@/services/weather-service';
import { useAuthStore } from '@/stores/use-auth-store';

// 灵感盲盒快捷 Prompt 胶囊
const INSPIRATION_CAPSULES = [
  { id: '1', title: '🍃 杭州 3 日慢节奏江南游', prompt: '我想去杭州玩3天，希望是慢节奏、文艺轻松的路线，包括西湖周边和特色茶舍。' },
  { id: '2', title: '🌶️ 成都周末 48 小时美食特种兵', prompt: '计划去成都度过周末48小时，主打地道川味美食、茶馆和拍照打卡。' },
  { id: '3', title: '🌊 三亚 4 天海岛度假漫游', prompt: '去三亚4天3晚，追求高性价比与海滩放松，预算3000元以内，求避坑建议。' },
  { id: '4', title: '🏮 西安古都汉服与历史寻踪', prompt: '3天时间去西安，想体验汉服夜游大唐不夜城、参观兵马俑和陕博，求路线安排。' },
  { id: '5', title: '🏔️ 川西 5 日小众秘境自驾', prompt: '川西5天自驾行程，想要雪山草甸与小众打卡点，注意高反防护与沿途食宿。' },
];

// 精选目的地手账卡片
const FEATURED_DESTINATIONS = [
  {
    id: 'hz',
    name: '杭州 · 诗意江南',
    days: '3-4 天',
    budget: '¥1,500 ~ ¥2,500',
    tags: ['江南水乡', '龙井问茶', '骑行漫游'],
    image: 'https://images.unsplash.com/photo-1599571234909-29ed5d1321d6?q=80&w=800&auto=format&fit=crop',
    description: '漫步西湖杨公堤，在满觉陇寻一处清幽茶社，享受微风与慢时光。',
    prompt: '我想去杭州深度游玩3天，请结合西湖周边与灵隐祈福为我制定详细手账行程。',
  },
  {
    id: 'cd',
    name: '成都 · 烟火锦官',
    days: '2-3 天',
    budget: '¥1,200 ~ ¥2,000',
    tags: ['地道小吃', '盖碗茶', '大熊猫'],
    image: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?q=80&w=800&auto=format&fit=crop',
    description: '人民公园喝一杯鹤鸣盖碗茶，穿梭在宽窄巷子的老街深处品尝糖油果子。',
    prompt: '我想去成都吃喝玩乐2天，请帮我规划一份不赶路的地道美食手账攻略。',
  },
  {
    id: 'sy',
    name: '三亚 · 碧海清风',
    days: '4-5 天',
    budget: '¥3,000 ~ ¥5,000',
    tags: ['海风椰林', '落日帆船', '海鲜排档'],
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
    description: '在太阳湾沿海公路迎风自驾，傍晚静候椰梦长廊的橘红色落日晚霞。',
    prompt: '帮我设计一份三亚4天度假行程，重点在海景拍照、小众海滩与平价海鲜。',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [city, setCity] = useState('北京');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCityAndWeather = async () => {
    try {
      setLoadingWeather(true);
      const currentCity = await WeatherService.getCurrentCity();
      setCity(currentCity);
      const wData = await WeatherService.getWeather(currentCity);
      setWeather(wData);
    } catch {
      // ignore
    } finally {
      setLoadingWeather(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCityAndWeather();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCityAndWeather();
  };

  const handleStartPlan = (promptText: string) => {
    router.push({
      pathname: '/(tabs)/chat' as any,
      params: { prompt: promptText },
    });
  };

  const getTodayDateString = () => {
    const d = new Date();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${d.getMonth() + 1}月${d.getDate()}日 · ${weekDays[d.getDay()]}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部手账状态栏 */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.appTitle}>旅行家手账</Text>
          <Text style={styles.dateSubtitle}>{getTodayDateString()}</Text>
        </View>

        <TouchableOpacity
          style={styles.userBadge}
          onPress={() => {
            if (user) {
              router.push('/(tabs)/profile' as any);
            } else {
              router.push('/(auth)/login' as any);
            }
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name={user ? 'person-circle' : 'person-circle-outline'}
            size={34}
            color={user ? JournalTheme.colors.primary : JournalTheme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={JournalTheme.colors.primary}
          />
        }
      >
        {/* 天气与出行指数挂件 */}
        <JournalCard style={styles.weatherCard} variant="warm">
          <View style={styles.weatherTopRow}>
            <View style={styles.cityLocationRow}>
              <Ionicons
                name="location-sharp"
                size={16}
                color={JournalTheme.colors.primary}
              />
              <Text style={styles.cityName}>{city}</Text>
              <StampBadge label="当前位置" color="primary" size="sm" rotation={-4} />
            </View>

            {loadingWeather ? (
              <ActivityIndicator size="small" color={JournalTheme.colors.primary} />
            ) : (
              <View style={styles.tempRow}>
                <Ionicons
                  name={weather?.condition.includes('雨') ? 'rainy-outline' : 'sunny-outline'}
                  size={20}
                  color={JournalTheme.colors.primary}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.tempText}>{weather?.temp}°C</Text>
                <Text style={styles.conditionText}>{weather?.condition}</Text>
              </View>
            )}
          </View>

          <View style={styles.dividerDashed} />

          <Text style={styles.weatherTips} numberOfLines={2}>
            🌿 {weather?.tips || '今日天气适宜出行，记录属于你的美好旅途！'}
          </Text>
        </JournalCard>

        {/* 灵感盲盒胶囊栏 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>灵感盲盒</Text>
          <Text style={styles.sectionSubtitle}>点击一键生成专属手账</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.capsulesContainer}
        >
          {INSPIRATION_CAPSULES.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.capsule}
              onPress={() => handleStartPlan(item.prompt)}
              activeOpacity={0.75}
            >
              <Text style={styles.capsuleText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 核心 AI 规划快捷卡片 */}
        <JournalCard style={styles.aiBannerCard}>
          <View style={styles.aiBannerContent}>
            <View style={styles.aiBannerLeft}>
              <StampBadge label="AI 旅行顾问" color="red" size="sm" rotation={-6} />
              <Text style={styles.aiBannerTitle}>你想去哪里旅行？</Text>
              <Text style={styles.aiBannerDesc}>
                告诉我目的地、天数或预算，AI 将为你规划结构化手账日程
              </Text>
            </View>
            <View style={styles.aiBannerIconWrap}>
              <Ionicons
                name="sparkles"
                size={36}
                color={JournalTheme.colors.primary}
              />
            </View>
          </View>

          <JournalButton
            title="开始定制我的行程"
            variant="primary"
            size="md"
            icon={
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
            }
            onPress={() => handleStartPlan('')}
            style={styles.aiBannerBtn}
          />
        </JournalCard>

        {/* 精选目的地手账卡片流 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>精选目的地</Text>
          <Text style={styles.sectionSubtitle}>手账旅行家倾心推荐</Text>
        </View>

        {FEATURED_DESTINATIONS.map((dest) => (
          <JournalCard key={dest.id} style={styles.destCard}>
            <Image source={{ uri: dest.image }} style={styles.destImage} />
            <View style={styles.destBody}>
              <View style={styles.destHeaderRow}>
                <Text style={styles.destName}>{dest.name}</Text>
                <StampBadge label={dest.days} color="blue" size="sm" rotation={4} />
              </View>

              <View style={styles.destTagsRow}>
                {dest.tags.map((tag, idx) => (
                  <View key={idx} style={styles.destTag}>
                    <Text style={styles.destTagText}>#{tag}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.destDesc}>{dest.description}</Text>

              <View style={styles.destFooter}>
                <View>
                  <Text style={styles.destBudgetLabel}>预估人均</Text>
                  <Text style={styles.destBudgetValue}>{dest.budget}</Text>
                </View>

                <JournalButton
                  title="AI 规划此地"
                  size="sm"
                  variant="outlined"
                  onPress={() => handleStartPlan(dest.prompt)}
                />
              </View>
            </View>
          </JournalCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: JournalTheme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: JournalTheme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  dateSubtitle: {
    fontSize: 12,
    color: JournalTheme.colors.textSecondary,
    marginTop: 2,
  },
  userBadge: {
    padding: 2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  weatherCard: {
    marginTop: Spacing.two,
    padding: Spacing.three,
  },
  weatherTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cityLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cityName: {
    fontSize: 16,
    fontWeight: '700',
    color: JournalTheme.colors.textPrimary,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tempText: {
    fontSize: 16,
    fontWeight: '700',
    color: JournalTheme.colors.primary,
    marginRight: 6,
  },
  conditionText: {
    fontSize: 14,
    color: JournalTheme.colors.textSecondary,
  },
  dividerDashed: {
    height: 1,
    borderWidth: 0.5,
    borderColor: JournalTheme.colors.border,
    borderStyle: 'dashed',
    marginVertical: Spacing.two,
  },
  weatherTips: {
    fontSize: 13,
    color: JournalTheme.colors.textPrimary,
    lineHeight: 18,
  },
  sectionHeader: {
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: JournalTheme.colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: JournalTheme.colors.textSecondary,
    marginTop: 2,
  },
  capsulesContainer: {
    paddingVertical: Spacing.one,
    gap: Spacing.two,
  },
  capsule: {
    backgroundColor: JournalTheme.colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: JournalTheme.radii.full,
    borderWidth: 1,
    borderColor: JournalTheme.colors.border,
    marginRight: Spacing.two,
    ...JournalTheme.shadows.card,
  },
  capsuleText: {
    fontSize: 13,
    fontWeight: '600',
    color: JournalTheme.colors.textPrimary,
  },
  aiBannerCard: {
    marginTop: Spacing.four,
    backgroundColor: '#FFF8F4',
    borderColor: '#F5DACF',
  },
  aiBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  aiBannerLeft: {
    flex: 1,
    paddingRight: Spacing.two,
  },
  aiBannerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: JournalTheme.colors.textPrimary,
    marginTop: Spacing.two,
  },
  aiBannerDesc: {
    fontSize: 12,
    color: JournalTheme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  aiBannerIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFEFEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBannerBtn: {
    marginTop: Spacing.three,
  },
  destCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: Spacing.four,
  },
  destImage: {
    width: '100%',
    height: 150,
    backgroundColor: JournalTheme.colors.border,
  },
  destBody: {
    padding: Spacing.three,
  },
  destHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  destName: {
    fontSize: 17,
    fontWeight: '700',
    color: JournalTheme.colors.textPrimary,
  },
  destTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: Spacing.two,
  },
  destTag: {
    backgroundColor: JournalTheme.colors.surfaceWarm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: JournalTheme.radii.sm,
  },
  destTagText: {
    fontSize: 11,
    color: JournalTheme.colors.textSecondary,
  },
  destDesc: {
    fontSize: 13,
    color: JournalTheme.colors.textPrimary,
    lineHeight: 19,
    marginBottom: Spacing.three,
  },
  destFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: JournalTheme.colors.borderLight,
    paddingTop: Spacing.two,
  },
  destBudgetLabel: {
    fontSize: 11,
    color: JournalTheme.colors.textSecondary,
  },
  destBudgetValue: {
    fontSize: 14,
    fontWeight: '700',
    color: JournalTheme.colors.primary,
  },
});
