import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { JournalTheme, Spacing } from '@/constants/theme';

interface MarkdownTextProps {
  content: string;
  style?: TextStyle;
  containerStyle?: ViewStyle;
}

/**
 * 将包含 **加粗** 的单行文本解析为内联 Text 片段
 */
function renderInlineFormatted(
  text: string,
  baseStyle?: TextStyle,
  keyPrefix = 'inline',
): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const boldText = part.slice(2, -2);
      return (
        <Text
          key={`${keyPrefix}-bold-${index}`}
          style={[baseStyle, styles.bold]}
        >
          {boldText}
        </Text>
      );
    }
    return (
      <Text key={`${keyPrefix}-txt-${index}`} style={baseStyle}>
        {part}
      </Text>
    );
  });
}

/**
 * 专为旅行手账场景定制的轻量 Markdown 格式化渲染组件
 */
export function MarkdownText({
  content,
  style,
  containerStyle,
}: MarkdownTextProps) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <View style={[styles.container, containerStyle]}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // 空行
        if (!trimmed) {
          return <View key={`empty-${lineIdx}`} style={styles.emptyLine} />;
        }

        // H1
        if (trimmed.startsWith('# ')) {
          const title = trimmed.replace(/^#\s+/, '');
          return (
            <Text key={`h1-${lineIdx}`} style={[styles.h1, style]}>
              {renderInlineFormatted(title, styles.h1, `h1-${lineIdx}`)}
            </Text>
          );
        }

        // H2
        if (trimmed.startsWith('## ')) {
          const title = trimmed.replace(/^##\s+/, '');
          return (
            <Text key={`h2-${lineIdx}`} style={[styles.h2, style]}>
              {renderInlineFormatted(title, styles.h2, `h2-${lineIdx}`)}
            </Text>
          );
        }

        // H3
        if (trimmed.startsWith('### ')) {
          const title = trimmed.replace(/^###\s+/, '');
          return (
            <Text key={`h3-${lineIdx}`} style={[styles.h3, style]}>
              {renderInlineFormatted(title, styles.h3, `h3-${lineIdx}`)}
            </Text>
          );
        }

        // 引用块
        if (trimmed.startsWith('> ')) {
          const quote = trimmed.replace(/^>\s+/, '');
          return (
            <View key={`quote-${lineIdx}`} style={styles.quoteBlock}>
              <Text style={styles.quoteText}>
                {renderInlineFormatted(quote, styles.quoteText, `q-${lineIdx}`)}
              </Text>
            </View>
          );
        }

        // 无序列表
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const itemText = trimmed.replace(/^[-*]\s+/, '');
          return (
            <View key={`list-${lineIdx}`} style={styles.listItemRow}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={[styles.paragraph, style, styles.listText]}>
                {renderInlineFormatted(
                  itemText,
                  styles.paragraph,
                  `li-${lineIdx}`,
                )}
              </Text>
            </View>
          );
        }

        // 有序列表 (如 1. 2.)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          const num = numMatch[1];
          const itemText = numMatch[2];
          return (
            <View key={`numlist-${lineIdx}`} style={styles.listItemRow}>
              <Text style={styles.numBadge}>{num}.</Text>
              <Text style={[styles.paragraph, style, styles.listText]}>
                {renderInlineFormatted(
                  itemText,
                  styles.paragraph,
                  `nli-${lineIdx}`,
                )}
              </Text>
            </View>
          );
        }

        // 普通正文段落
        return (
          <Text key={`p-${lineIdx}`} style={[styles.paragraph, style]}>
            {renderInlineFormatted(line, styles.paragraph, `p-${lineIdx}`)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: JournalTheme.colors.textPrimary,
    marginBottom: 4,
  },
  bold: {
    fontWeight: '700',
    color: JournalTheme.colors.primaryDark,
  },
  h1: {
    fontSize: 18,
    fontWeight: '800',
    color: JournalTheme.colors.primary,
    marginTop: Spacing.two,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  h2: {
    fontSize: 16,
    fontWeight: '700',
    color: JournalTheme.colors.secondary,
    marginTop: Spacing.two,
    marginBottom: 4,
  },
  h3: {
    fontSize: 15,
    fontWeight: '700',
    color: JournalTheme.colors.textPrimary,
    marginTop: 6,
    marginBottom: 4,
  },
  emptyLine: {
    height: 6,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 22,
    color: JournalTheme.colors.primary,
    marginRight: 6,
  },
  numBadge: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    color: JournalTheme.colors.secondary,
    marginRight: 6,
  },
  listText: {
    flex: 1,
    marginBottom: 0,
  },
  quoteBlock: {
    borderLeftWidth: 3,
    borderLeftColor: JournalTheme.colors.primary,
    backgroundColor: JournalTheme.colors.surfaceWarm,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: JournalTheme.radii.sm,
    marginVertical: 4,
  },
  quoteText: {
    fontSize: 13,
    lineHeight: 19,
    color: JournalTheme.colors.textPrimary,
    fontStyle: 'italic',
  },
});
