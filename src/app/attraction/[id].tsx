import React, { useEffect, useState } from 'react';
import {
  Image,
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
  AttractionItem,
  AttractionsService,
} from '@/services/attractions-service';
import { useAuthStore } from '@/stores/use-auth-store';

export default function AttractionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; itemData?: string }>();
  const { user } = useAuthStore();

  const [item, setItem] = useState<AttractionItem | null>(() => {
    if (params.itemData) {
      try {
        return JSON.parse(params.itemData);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isFavorite, setIsFavorite] = useState<boolean>(() => {
    if (params.itemData) {
      try {
        const parsed = JSON.parse(params.itemData);
        return !!parsed?.isFavorite;
      } catch {
        return false;
      }
    }
    return false;
  });

  useEffect(() => {
    let active = true;
    if (!item && params.id) {
      AttractionsService.getAttractionDetail(params.id).then((detail) => {
        if (active && detail) {
          setItem(detail);
          setIsFavorite(!!detail.isFavorite);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [params.id, item]);

  const handleToggleFavorite = async () => {
    if (!user) {
      router.push('/(auth)/login' as any);
      return;
    }

    if (!item) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const nextState = !isFavorite;
    setIsFavorite(nextState);

    try {
      await AttractionsService.toggleFavorite(item.id);
    } catch {
      setIsFavorite(!nextState);
    }
  };

  const handlePlanWithAI = () => {
    if (!item) return;
    const prompt = `我想去${item.city}旅游，请帮我规划一条重点游览【${item.name}】的详细手账行程，包含周边地道美食与交通建议。`;
    router.dismiss();
    router.push({
      pathname: '/(tabs)/chat' as any,
      params: { prompt },
    });
  };

  if (!item) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部导航栏 */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="close"
            size={24}
            color={JournalTheme.colors.textPrimary}
          />
        </TouchableOpacity>

        <Text style={styles.navTitle} numberOfLines={1}>
          {item.name}
        </Text>

        <TouchableOpacity
          onPress={handleToggleFavorite}
          style={styles.iconBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={24}
            color={
              isFavorite
                ? JournalTheme.colors.stampRed
                : JournalTheme.colors.textSecondary
            }
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 封面照片 */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
          <View style={styles.stampOverlay}>
            <StampBadge
              label={item.city}
              color="blue"
              size="md"
              rotation={-4}
            />
          </View>
        </View>

        {/* 核心信息卡 */}
        <JournalCard style={styles.infoCard}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.ratingWrap}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={styles.ratingText}>
                {item.rating?.toFixed(1) || '4.8'}
              </Text>
            </View>
          </View>

          <Text style={styles.desc}>{item.description}</Text>

          <View style={styles.metaList}>
            <View style={styles.metaRow}>
              <Ionicons
                name="ticket-outline"
                size={16}
                color={JournalTheme.colors.primary}
              />
              <Text style={styles.metaLabel}>门票参考：</Text>
              <Text style={styles.metaValue}>
                {typeof item.price === 'number'
                  ? `¥${item.price}`
                  : item.price || '免费开放'}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons
                name="time-outline"
                size={16}
                color={JournalTheme.colors.secondary}
              />
              <Text style={styles.metaLabel}>开放时间：</Text>
              <Text style={styles.metaValue}>
                {item.openingHours || '全天开放'}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons
                name="hourglass-outline"
                size={16}
                color={JournalTheme.colors.accent}
              />
              <Text style={styles.metaLabel}>建议游玩：</Text>
              <Text style={styles.metaValue}>
                {item.recommendedDuration || '2-3 小时'}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons
                name="location-outline"
                size={16}
                color={JournalTheme.colors.textSecondary}
              />
              <Text style={styles.metaLabel}>详细地址：</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {item.address || `${item.city}核心景区`}
              </Text>
            </View>
          </View>

          {/* 旅行手账建议 */}
          {item.tips && (
            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>💡 手账游玩贴士</Text>
              <Text style={styles.tipsContent}>{item.tips}</Text>
            </View>
          )}

          {/* 一键 AI 定制按钮 */}
          <JournalButton
            title="将此景点加入 AI 旅行规划"
            variant="primary"
            size="lg"
            onPress={handlePlanWithAI}
            icon={
              <Ionicons
                name="sparkles-outline"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
            }
            style={{ marginTop: Spacing.four }}
          />
        </JournalCard>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    backgroundColor: JournalTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: JournalTheme.colors.border,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: JournalTheme.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.two,
  },
  iconBtn: {
    padding: Spacing.one,
  },
  scrollContent: {
    paddingBottom: Spacing.six,
  },
  imageContainer: {
    width: '100%',
    height: 240,
    backgroundColor: JournalTheme.colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  stampOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  infoCard: {
    marginHorizontal: Spacing.four,
    marginTop: -24,
    padding: Spacing.four,
    borderRadius: JournalTheme.radii.lg,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: JournalTheme.colors.textPrimary,
    flex: 1,
    marginRight: Spacing.two,
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: JournalTheme.colors.textPrimary,
  },
  desc: {
    fontSize: 14,
    color: JournalTheme.colors.textPrimary,
    lineHeight: 21,
    marginBottom: Spacing.three,
  },
  metaList: {
    backgroundColor: JournalTheme.colors.surfaceWarm,
    borderRadius: JournalTheme.radii.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 13,
    color: JournalTheme.colors.textSecondary,
    marginLeft: 6,
    width: 75,
  },
  metaValue: {
    fontSize: 13,
    color: JournalTheme.colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  tipsBox: {
    marginTop: Spacing.three,
    backgroundColor: '#FEF9F3',
    borderWidth: 1,
    borderColor: '#FBE8D3',
    borderRadius: JournalTheme.radii.md,
    padding: Spacing.three,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: JournalTheme.colors.primary,
    marginBottom: 4,
  },
  tipsContent: {
    fontSize: 13,
    color: JournalTheme.colors.textPrimary,
    lineHeight: 18,
  },
});
