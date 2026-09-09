import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { JournalTheme, Spacing } from '@/constants/theme';

export interface JournalCardProps extends ViewProps {
  variant?: 'default' | 'warm' | 'outlined';
  elevated?: boolean;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

/**
 * 手账质感卡片容器
 * 模拟温润纸张悬浮感与细微边框
 */
export function JournalCard({
  variant = 'default',
  elevated = true,
  style,
  children,
  ...rest
}: JournalCardProps) {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'warm':
        return JournalTheme.colors.surfaceWarm;
      case 'outlined':
        return 'transparent';
      default:
        return JournalTheme.colors.surface;
    }
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: getBackgroundColor() },
        elevated && JournalTheme.shadows.card,
        variant === 'outlined' && styles.outlined,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: JournalTheme.radii.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: JournalTheme.colors.border,
  },
  outlined: {
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: JournalTheme.colors.primary,
  },
});
