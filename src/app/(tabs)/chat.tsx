import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JournalTheme, Spacing } from '@/constants/theme';
import { ItinerarySummaryCard } from '@/components/journal/ItinerarySummaryCard';
import { ChatMessage, useChatStore } from '@/stores/use-chat-store';

const SUGGESTED_QUESTIONS = [
  '预算人均 2000 元，去哪玩比较好？',
  '带父母去北京玩 4 天，求轻松不费脚的路线',
  '成都 3 天 2 晚，主要想打卡地道川菜和古镇',
  '青岛海边 3 日游，推荐高性价比海景住宿',
];

export default function ChatScreen() {
  const params = useLocalSearchParams<{ prompt?: string }>();
  const { messages, isGenerating, sendMessage, stopGenerating, clearMessages } =
    useChatStore();

  const [input, setInput] = useState('');
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const flatListRef = useRef<FlatList>(null);

  // 处理从首页或外部带入的 prompt
  useEffect(() => {
    if (params?.prompt && typeof params.prompt === 'string') {
      sendMessage(params.prompt);
    }
  }, [params?.prompt]);

  // 新消息产生时平滑滚动到底部
  useEffect(() => {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, messages[messages.length - 1]?.content]);

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
              <Text style={styles.aiText}>{item.content}</Text>
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
            {item.plan && <ItinerarySummaryCard plan={item.plan} />}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部标题栏 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>AI 旅行手账助理</Text>
          <Text style={styles.headerSubtitle}>
            {isGenerating ? '正在规划中...' : '灵感对话与路线定制'}
          </Text>
        </View>

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
        />

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
});
