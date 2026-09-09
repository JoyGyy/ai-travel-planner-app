import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { JournalTheme, Spacing } from '@/constants/theme';
import { JournalCard } from './JournalCard';
import { StampBadge } from './StampBadge';
import { JournalButton } from './JournalButton';

export interface ItinerarySummaryCardProps {
  plan: {
    id?: string;
    title?: string;
    destination?: string;
    days?: number | any[];
    totalDays?: number;
    budget?: string | number;
    highlights?: string[];
    summary?: string;
  };
  onSave?: (plan: any) => void;
  isSaved?: boolean;
}

/**
 * AI 生成的行程摘要手账卡片
 */
export function ItinerarySummaryCard({
  plan,
  onSave,
  isSaved = false,
}: ItinerarySummaryCardProps) {
  const router = useRouter();

  const title = plan.title || `${plan.destination || '目的地'}手账行程`;
  const daysCount =
    plan.totalDays ||
    (Array.isArray(plan.days) ? plan.days.length : plan.days) ||
    3;
  const budgetText =
    typeof plan.budget === 'number'
      ? `¥${plan.budget}`
      : plan.budget || '¥1,500 ~ ¥2,500';

  const handleOpenDetail = () => {
    // 携带 plan 数据导航至行程全屏详情页
    router.push({
      pathname: '/itinerary/[id]' as any,
      params: {
        id: plan.id || 'current_plan',
        planData: JSON.stringify(plan),
      },
    });
  };

  return (
    <JournalCard style={styles.card} variant="warm">
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.badgeRow}>
            <StampBadge label={`${daysCount} 日游`} color="primary" size="sm" rotation={-3} />
            {plan.destination ? (
              <StampBadge label={plan.destination} color="blue" size="sm" rotation={2} />
            ) : null}
          </View>
        </View>
        <Ionicons name="map-outline" size={32} color={JournalTheme.colors.primary} />
      </View>

      <View style={styles.divider} />

      {plan.summary ? (
        <Text style={styles.summaryText}>{plan.summary}</Text>
      ) : null}

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>预估预算</Text>
          <Text style={styles.infoValue}>{budgetText}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>节奏规划</Text>
          <Text style={styles.infoValue}>悠闲漫游</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <JournalButton
          title="展开手账全景"
          variant="primary"
          size="sm"
          onPress={handleOpenDetail}
          icon={
            <Ionicons
              name="book-outline"
              size={16}
              color="#FFFFFF"
              style={{ marginRight: 4 }}
            />
          }
          style={{ flex: 1, marginRight: Spacing.two }}
        />

        <JournalButton
          title={isSaved ? '已保存' : '存入手账'}
          variant={isSaved ? 'ghost' : 'outlined'}
          size="sm"
          onPress={() => onSave?.(plan)}
          disabled={isSaved}
          icon={
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={JournalTheme.colors.primary}
              style={{ marginRight: 4 }}
            />
          }
        />
      </View>
    </JournalCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.three,
    backgroundColor: '#FFFDF9',
    borderColor: '#E8DED1',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleWrap: {
    flex: 1,
    paddingRight: Spacing.two,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: JournalTheme.colors.textPrimary,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  divider: {
    height: 1,
    borderWidth: 0.5,
    borderColor: JournalTheme.colors.border,
    borderStyle: 'dashed',
    marginVertical: Spacing.two,
  },
  summaryText: {
    fontSize: 13,
    color: JournalTheme.colors.textPrimary,
    lineHeight: 18,
    marginBottom: Spacing.two,
  },
  infoRow: {
    flexDirection: 'row',
    backgroundColor: JournalTheme.colors.surface,
    borderRadius: JournalTheme.radii.md,
    padding: Spacing.two,
    marginBottom: Spacing.three,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: JournalTheme.colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: JournalTheme.colors.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
