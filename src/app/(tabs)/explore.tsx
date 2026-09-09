import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { JournalTheme, Spacing } from '@/constants/theme';
import { JournalCard } from '@/components/journal/JournalCard';
import { StampBadge } from '@/components/journal/StampBadge';
import {
  AttractionItem,
  AttractionsService,
} from '@/services/attractions-service';
import { useAuthStore } from '@/stores/use-auth-store';

const CATEGORIES = ['全部', '自然风光', '历史人文', '特色美食', '拍照打卡'];

export default function ExploreScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [cities, setCities] = useState<string[]>(['全部']);
  const [selectedCity, setSelectedCity] = useState('全部');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [attractions, setAttractions] = useState<AttractionItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 搜索词 300ms 防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // 初始化城市与收藏
  useEffect(() => {
    let active = true;
    async function initData() {
      const cityList = await AttractionsService.getCities();
      if (!active) return;
      setCities(['全部', ...cityList.filter((c) => c !== '全部')]);

      if (user) {
        const favs = await AttractionsService.getFavoriteIds();
        if (active) {
          setFavoriteIds(new Set(favs));
        }
      }
    }
    initData();
    return () => {
      active = false;
    };
  }, [user]);

  // 获取景点列表（由 selectedCity, selectedCategory, debouncedKeyword 驱动）
  useEffect(() => {
    let active = true;

    AttractionsService.getAttractions({
      city: selectedCity,
      category: selectedCategory,
      keyword: debouncedKeyword,
    })
      .then((list) => {
        if (!active) return;
        setAttractions(list);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          list.forEach((item) => {
            if (item.isFavorite) next.add(item.id);
          });
          return next;
        });
      })
      .catch(() => {
        if (!active) return;
        setAttractions([]);
      })
      .finally(() => {
        if (!active) return;
        setIsInitialLoading(false);
        setIsFiltering(false);
        setRefreshing(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCity, selectedCategory, debouncedKeyword]);

  const handleRefresh = () => {
    setRefreshing(true);
    AttractionsService.getAttractions({
      city: selectedCity,
      category: selectedCategory,
      keyword: debouncedKeyword,
    })
      .then((list) => {
        setAttractions(list);
      })
      .catch(() => {})
      .finally(() => {
        setRefreshing(false);
      });
  };

  const handleSearchSubmit = () => {
    setDebouncedKeyword(searchKeyword.trim());
  };

  const handleClearSearch = () => {
    setSearchKeyword('');
    setDebouncedKeyword('');
  };

  const handleToggleFavorite = async (item: AttractionItem) => {
    if (!user) {
      router.push('/(auth)/login' as any);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const isCurrentlyFav = favoriteIds.has(item.id);

    // 乐观更新
    const nextSet = new Set(favoriteIds);
    if (isCurrentlyFav) {
      nextSet.delete(item.id);
    } else {
      nextSet.add(item.id);
    }
    setFavoriteIds(nextSet);

    try {
      await AttractionsService.toggleFavorite(item.id);
    } catch {
      // 失败回退
      setFavoriteIds(favoriteIds);
    }
  };

  const renderAttractionCard = ({ item }: { item: AttractionItem }) => {
    const isFav = favoriteIds.has(item.id);

    return (
      <JournalCard style={styles.card}>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: '/attraction/[id]' as any,
              params: { id: item.id, itemData: JSON.stringify(item) },
            })
          }
          activeOpacity={0.85}
        >
          <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />

          <TouchableOpacity
            style={styles.favBtn}
            onPress={() => handleToggleFavorite(item)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isFav ? 'heart' : 'heart-outline'}
              size={20}
              color={isFav ? JournalTheme.colors.stampRed : '#FFFFFF'}
            />
          </TouchableOpacity>

          <View style={styles.cardBody}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.attractionName} numberOfLines={1}>
                {item.name}
              </Text>
              <StampBadge
                label={`${item.city}`}
                color="blue"
                size="sm"
                rotation={3}
              />
            </View>

            <View style={styles.tagRow}>
              {item.category ? (
                <View style={styles.badgeWrap}>
                  <Text style={styles.badgeText}>{item.category}</Text>
                </View>
              ) : null}

              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {item.rating?.toFixed(1) || '4.8'}
                </Text>
              </View>

              <Text style={styles.priceText}>
                {typeof item.price === 'number'
                  ? `¥${item.price}`
                  : item.price || '免费'}
              </Text>
            </View>

            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
        </TouchableOpacity>
      </JournalCard>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部标题与搜索 */}
      <View style={styles.header}>
        <Text style={styles.title}>探索灵感目的地</Text>
        <Text style={styles.subtitle}>打卡高分景点，点亮专属旅行手账</Text>

        <View style={styles.searchBar}>
          <Ionicons
            name="search-outline"
            size={18}
            color={JournalTheme.colors.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索景点、老街、古镇..."
            placeholderTextColor={JournalTheme.colors.textSecondary}
            value={searchKeyword}
            onChangeText={(text) => {
              setSearchKeyword(text);
              setIsFiltering(true);
            }}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {isFiltering ? (
            <ActivityIndicator
              size="small"
              color={JournalTheme.colors.primary}
              style={{ marginRight: 4 }}
            />
          ) : searchKeyword.length > 0 ? (
            <TouchableOpacity
              onPress={handleClearSearch}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="close-circle"
                size={16}
                color={JournalTheme.colors.textSecondary}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* 城市滚动筛选 */}
      <View style={styles.filterSection}>
        <FlatList
          horizontal
          data={cities}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isSelected = selectedCity === item;
            return (
              <TouchableOpacity
                style={[styles.cityChip, isSelected && styles.cityChipActive]}
                onPress={() => {
                  setSelectedCity(item);
                  setIsFiltering(true);
                }}
              >
                <Text
                  style={[styles.cityText, isSelected && styles.cityTextActive]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* 分类滚动筛选 */}
      <View style={styles.categorySection}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item;
            return (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipActive,
                ]}
                onPress={() => {
                  setSelectedCategory(item);
                  setIsFiltering(true);
                }}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isSelected && styles.categoryTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* 景点列表 */}
      {isInitialLoading && attractions.length === 0 ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={JournalTheme.colors.primary} />
          <Text style={styles.loadingText}>正在翻开手账景点库...</Text>
        </View>
      ) : (
        <FlatList
          data={attractions}
          keyExtractor={(item) => item.id}
          renderItem={renderAttractionCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={JournalTheme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons
                name="leaf-outline"
                size={48}
                color={JournalTheme.colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>暂未找到相关景点</Text>
              <Text style={styles.emptyDesc}>
                换个城市或搜索词试试，或者让 AI 为你推荐
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: JournalTheme.colors.background,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: JournalTheme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: JournalTheme.colors.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.three,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: JournalTheme.colors.surface,
    borderRadius: JournalTheme.radii.md,
    borderWidth: 1,
    borderColor: JournalTheme.colors.border,
    paddingHorizontal: Spacing.three,
    height: 44,
    ...JournalTheme.shadows.card,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.two,
    fontSize: 14,
    color: JournalTheme.colors.textPrimary,
  },
  filterSection: {
    paddingVertical: Spacing.one,
  },
  filterList: {
    paddingHorizontal: Spacing.four,
    gap: 8,
  },
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: JournalTheme.radii.full,
    backgroundColor: JournalTheme.colors.surface,
    borderWidth: 1,
    borderColor: JournalTheme.colors.border,
    marginRight: 6,
  },
  cityChipActive: {
    backgroundColor: JournalTheme.colors.primary,
    borderColor: JournalTheme.colors.primary,
  },
  cityText: {
    fontSize: 13,
    fontWeight: '600',
    color: JournalTheme.colors.textPrimary,
  },
  cityTextActive: {
    color: '#FFFFFF',
  },
  categorySection: {
    paddingBottom: Spacing.two,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: JournalTheme.radii.sm,
    backgroundColor: JournalTheme.colors.surfaceWarm,
    marginRight: 6,
  },
  categoryChipActive: {
    backgroundColor: JournalTheme.colors.secondary,
  },
  categoryText: {
    fontSize: 12,
    color: JournalTheme.colors.textSecondary,
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: Spacing.three,
  },
  cardImage: {
    width: '100%',
    height: 160,
    backgroundColor: JournalTheme.colors.border,
  },
  favBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: Spacing.three,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attractionName: {
    fontSize: 17,
    fontWeight: '700',
    color: JournalTheme.colors.textPrimary,
    flex: 1,
    marginRight: Spacing.two,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: Spacing.one,
  },
  badgeWrap: {
    backgroundColor: JournalTheme.colors.surfaceWarm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: JournalTheme.radii.sm,
  },
  badgeText: {
    fontSize: 11,
    color: JournalTheme.colors.textSecondary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: JournalTheme.colors.textPrimary,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: JournalTheme.colors.primary,
    marginLeft: 'auto',
  },
  description: {
    fontSize: 13,
    color: JournalTheme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: JournalTheme.colors.textSecondary,
    marginTop: Spacing.two,
  },
  emptyWrap: {
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
    marginTop: 4,
  },
});
