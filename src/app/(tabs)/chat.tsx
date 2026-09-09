import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JournalTheme, Spacing } from '@/constants/theme';
import { ItinerarySummaryCard } from '@/components/journal/ItinerarySummaryCard';
import { MarkdownText } from '@/components/journal/MarkdownText';
import { ChatMessage, useChatStore } from '@/stores/use-chat-store';
import { useItineraryStore } from '@/stores/use-itinerary-store';

const SUGGESTED_QUESTIONS = [
  '预算人均 2000 元，去哪玩比较好？',
  '带父母去北京玩 4 天，求轻松不费脚的路线',
  '成都 3 天 2 晚，主要想打卡地道川菜和古镇',
  '青岛海边 3 日游，推荐高性价比海景住宿',
];

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prompt?: string }>();
  const {
    messages,
    isGenerating,
    sendMessage,
    stopGenerating,
    clearMessages,
    sessions,
    currentSessionId,
    loadSessions,
    switchSession,
    createNewSession,
    deleteSession,
  } = useChatStore();

  const { savePlan, savedPlans, loadSavedPlans } = useItineraryStore();

  const [input, setInput] = useState('');
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [expandedThoughts, setExpandedThoughts] = useState<
    Record<string, boolean>
  >({});
  const flatListRef = useRef<FlatList>(null);
  const handledPromptRef = useRef<string | null>(null);
  const isAtBottomRef = useRef(true);

  useEffect(() => {
    loadSessions();
    loadSavedPlans();
  }, [loadSessions, loadSavedPlans]);

  // 处理从首页或外部带入的 prompt，保障单次消费避免重入
  useEffect(() => {
    if (
      params?.prompt &&
      typeof params.prompt === 'string' &&
      handledPromptRef.current !== params.prompt
    ) {
      handledPromptRef.current = params.prompt;
      sendMessage(params.prompt);
      router.setParams({ prompt: undefined });
    }
  }, [params?.prompt, sendMessage, router]);

  const lastMessageContent = messages[messages.length - 1]?.content;

  // 智能跟随滚底：仅当用户处于底部时自动跟随新消息，若用户上滑回看则不强行打扰
  useEffect(() => {
    if (isAtBottomRef.current) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [messages, lastMessageContent]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 80;
    const atBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    isAtBottomRef.current = atBottom;
    if (atBottom !== isAtBottom) {
      setIsAtBottom(atBottom);
    }
  };

  const scrollToBottom = (animated = true) => {
    flatListRef.current?.scrollToEnd({ animated });
    isAtBottomRef.current = true;
    setIsAtBottom(true);
  };

  const showScrollBottomBtn = !isAtBottom && isGenerating;

  const handleSend = () => {
    if (!input.trim() || isGenerating) return;
    const text = input;
    setInput('');
    sendMessage(text);
  };

  const toggleThought = (msgId: string) => {
    setExpandedThoughts((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    if (isUser) {
      return (
        <View style={styles.userMessageRow}>
          <View style={styles.userBubble}>
            <Text style={styles.userText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    const hasThought = !!item.thought?.trim();
    const isThoughtExpanded = !!expandedThoughts[item.id];

    return (
      <View style={styles.aiMessageRow}>
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={16} color="#FFFFFF" />
        </View>

        <View style={styles.aiMessageContent}>
          {/* 思考过程折叠卡片 */}
          {hasThought && (
            <TouchableOpacity
              style={styles.thoughtCard}
              onPress={() => toggleThought(item.id)}
              activeOpacity={0.75}
            >
              <View style={styles.thoughtHeader}>
                <Ionicons
                  name="bulb-outline"
                  size={14}
                  color={JournalTheme.colors.secondary}
                />
                <Text style={styles.thoughtTitle}>AI 规划思考过程</Text>
                <Ionicons
                  name={isThoughtExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={JournalTheme.colors.textSecondary}
                />
              </View>
              {isThoughtExpanded && (
                <Text style={styles.thoughtBody}>{item.thought}</Text>
              )}
            </TouchableOpacity>
          )}

          {/* AI 消息正文气泡 */}
          <View style={styles.aiBubble}>
            {item.content ? (
              <MarkdownText content={item.content} style={styles.aiText} />
            ) : isGenerating ? (
              <View style={styles.typingRow}>
                <ActivityIndicator
                  size="small"
                  color={JournalTheme.colors.primary}
                />
                <Text style={styles.typingText}>手账小助理正在规划中...</Text>
              </View>
            ) : null}

            {/* 挂载结构化行程手账卡 */}
            {item.plan && (
              <ItinerarySummaryCard
                plan={item.plan}
                isSaved={savedPlans.some(
                  (p) =>
                    p.id === item.plan?.id ||
                    (Boolean(p.title) &&
                      p.title === item.plan?.title &&
                      p.destination === item.plan?.destination),
                )}
                onSave={async (planToSave) => {
                  await savePlan(planToSave);
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  ).catch(() => {});
                  Alert.alert(
                    '手账已封存',
                    `已成功将「${planToSave.title || '行程'}」存入本地手账，可在「我的」页面随时离线查看！`,
                  );
                }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部标题栏 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.sessionBtn}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setShowSessionModal(true);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="albums-outline"
              size={20}
              color={JournalTheme.colors.secondary}
            />
            {sessions.length > 0 && (
              <View style={styles.sessionBadge}>
                <Text style={styles.sessionBadgeText}>{sessions.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              AI 旅行手账助理
            </Text>
            <Text style={styles.headerSubtitle}>
              {isGenerating ? '正在规划中...' : '灵感对话与路线定制'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                () => {},
              );
              createNewSession();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="add-circle-outline"
              size={22}
              color={JournalTheme.colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetBtn}
            onPress={clearMessages}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="refresh-outline"
              size={20}
              color={JournalTheme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 历史会话模态窗 */}
      <Modal
        visible={showSessionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSessionModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>历史旅行规划手账</Text>
            <TouchableOpacity
              onPress={() => setShowSessionModal(false)}
              style={styles.modalCloseBtn}
            >
              <Ionicons
                name="close"
                size={22}
                color={JournalTheme.colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.sessionList}
            renderItem={({ item }) => {
              const isCurrent = item.id === currentSessionId;
              return (
                <TouchableOpacity
                  style={[
                    styles.sessionItem,
                    isCurrent && styles.sessionItemCurrent,
                  ]}
                  onPress={() => {
                    switchSession(item.id);
                    setShowSessionModal(false);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.sessionItemLeft}>
                    <Ionicons
                      name={isCurrent ? 'book' : 'book-outline'}
                      size={20}
                      color={
                        isCurrent
                          ? JournalTheme.colors.primary
                          : JournalTheme.colors.textSecondary
                      }
                      style={{ marginRight: 10 }}
                    />
                    <View style={styles.sessionItemInfo}>
                      <Text
                        style={[
                          styles.sessionItemTitle,
                          isCurrent && styles.sessionItemTitleCurrent,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title || '旅行手账规划'}
                      </Text>
                      <Text style={styles.sessionItemDate}>
                        {new Date(
                          item.updatedAt || item.createdAt,
                        ).toLocaleDateString()}{' '}
                        · {item.messages.length} 条对话
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => deleteSession(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.sessionDeleteBtn}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={JournalTheme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.sessionEmpty}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={44}
                  color={JournalTheme.colors.textSecondary}
                />
                <Text style={styles.sessionEmptyTitle}>暂无历史规划</Text>
                <Text style={styles.sessionEmptyDesc}>
                  每一次与 AI 的深入探讨都会自动记录在此，随时重温
                </Text>
              </View>
            }
          />

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.newSessionBtn}
              onPress={() => {
                createNewSession();
                setShowSessionModal(false);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="add"
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.newSessionBtnText}>开启新旅行规划</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />

        {/* 悬浮回到底部按钮 */}
        {showScrollBottomBtn && (
          <TouchableOpacity
            style={styles.scrollToBottomBtn}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              scrollToBottom(true);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-down" size={14} color="#FFFFFF" />
            <Text style={styles.scrollToBottomText}>回到底部</Text>
          </TouchableOpacity>
        )}

        {/* 快捷问题胶囊推荐 */}
        {!isGenerating && messages.length <= 3 && (
          <View style={styles.suggestionsWrap}>
            <FlatList
              horizontal
              data={SUGGESTED_QUESTIONS}
              keyExtractor={(_, i) => String(i)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionChip}
                  onPress={() => sendMessage(item)}
                >
                  <Text style={styles.suggestionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* 底部输入框 */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="告诉我目的地、天数或喜好..."
            placeholderTextColor={JournalTheme.colors.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={300}
            editable={!isGenerating}
          />

          {isGenerating ? (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopGenerating}
              activeOpacity={0.8}
            >
              <Ionicons name="stop" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.sendButton,
                !input.trim() && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!input.trim()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: JournalTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: JournalTheme.colors.border,
    backgroundColor: JournalTheme.colors.surface,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: JournalTheme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: JournalTheme.colors.textSecondary,
    marginTop: 2,
  },
  resetBtn: {
    padding: Spacing.two,
    borderRadius: JournalTheme.radii.full,
    backgroundColor: JournalTheme.colors.background,
  },
  chatArea: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  userMessageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  userBubble: {
    backgroundColor: JournalTheme.colors.primary,
    borderRadius: JournalTheme.radii.lg,
    borderBottomRightRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: '82%',
    ...JournalTheme.shadows.card,
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 21,
  },
  aiMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: JournalTheme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.two,
    marginTop: 2,
  },
  aiMessageContent: {
    flex: 1,
    maxWidth: '88%',
  },
  thoughtCard: {
    backgroundColor: '#F0F4F8',
    borderRadius: JournalTheme.radii.md,
    padding: Spacing.two,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: '#D8E2EC',
  },
  thoughtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thoughtTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: JournalTheme.colors.secondary,
    marginLeft: 6,
  },
  thoughtBody: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 17,
    marginTop: Spacing.one,
    borderTopWidth: 0.5,
    borderTopColor: '#D8E2EC',
    paddingTop: 4,
  },
  aiBubble: {
    backgroundColor: JournalTheme.colors.surface,
    borderRadius: JournalTheme.radii.lg,
    borderTopLeftRadius: 4,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: JournalTheme.colors.border,
    ...JournalTheme.shadows.card,
  },
  aiText: {
    color: JournalTheme.colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  typingText: {
    fontSize: 13,
    color: JournalTheme.colors.textSecondary,
    marginLeft: Spacing.two,
  },
  suggestionsWrap: {
    paddingVertical: Spacing.one,
  },
  suggestionsList: {
    paddingHorizontal: Spacing.three,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: JournalTheme.colors.surface,
    borderRadius: JournalTheme.radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: JournalTheme.colors.border,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 12,
    color: JournalTheme.colors.textPrimary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: JournalTheme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: JournalTheme.colors.border,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: JournalTheme.colors.background,
    borderRadius: JournalTheme.radii.md,
    borderWidth: 1,
    borderColor: JournalTheme.colors.border,
    paddingHorizontal: Spacing.three,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: JournalTheme.colors.textPrimary,
    marginRight: Spacing.two,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: JournalTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  stopButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: JournalTheme.colors.stampRed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionBtn: {
    padding: Spacing.two,
    borderRadius: JournalTheme.radii.full,
    backgroundColor: JournalTheme.colors.background,
    marginRight: Spacing.two,
  },
  sessionBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: JournalTheme.colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  sessionBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  sessionList: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: JournalTheme.colors.surface,
    padding: Spacing.three,
    borderRadius: JournalTheme.radii.md,
    borderWidth: 1,
    borderColor: JournalTheme.colors.border,
    marginBottom: Spacing.two,
  },
  sessionItemCurrent: {
    borderColor: JournalTheme.colors.primary,
    backgroundColor: '#FFFBF9',
  },
  sessionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionItemInfo: {
    flex: 1,
  },
  sessionItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: JournalTheme.colors.textPrimary,
  },
  sessionItemTitleCurrent: {
    color: JournalTheme.colors.primary,
    fontWeight: '700',
  },
  sessionItemDate: {
    fontSize: 11,
    color: JournalTheme.colors.textSecondary,
    marginTop: 2,
  },
  sessionDeleteBtn: {
    padding: Spacing.two,
  },
  sessionEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
  sessionEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: JournalTheme.colors.textPrimary,
    marginTop: Spacing.two,
  },
  sessionEmptyDesc: {
    fontSize: 12,
    color: JournalTheme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
  modalFooter: {
    padding: Spacing.four,
    borderTopWidth: 1,
    borderTopColor: JournalTheme.colors.border,
    backgroundColor: JournalTheme.colors.surface,
  },
  newSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: JournalTheme.colors.primary,
    borderRadius: JournalTheme.radii.md,
    paddingVertical: 12,
  },
  newSessionBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollToBottomBtn: {
    position: 'absolute',
    right: Spacing.four,
    bottom: 74,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: JournalTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: JournalTheme.radii.full,
    ...JournalTheme.shadows.hover,
    zIndex: 20,
  },
  scrollToBottomText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
