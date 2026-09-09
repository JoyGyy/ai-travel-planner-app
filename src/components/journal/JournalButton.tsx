import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { JournalTheme, Spacing } from '@/constants/theme';

export interface JournalButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'outlined' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  haptic?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * 手账触感交互按钮
 * 支持触觉轻振动与微缩放反馈
 */
export function JournalButton({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  haptic = true,
  icon,
  style,
  textStyle,
  onPress,
  disabled,
  ...rest
}: JournalButtonProps) {
  const handlePress = (e: any) => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.(e);
  };

  const getVariantStyles = (): { btn: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'secondary':
        return {
          btn: { backgroundColor: JournalTheme.colors.secondary },
          text: { color: '#FFFFFF' },
        };
      case 'accent':
        return {
          btn: { backgroundColor: JournalTheme.colors.accent },
          text: { color: '#FFFFFF' },
        };
      case 'outlined':
        return {
          btn: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: JournalTheme.colors.primary,
          },
          text: { color: JournalTheme.colors.primary },
        };
      case 'ghost':
        return {
          btn: { backgroundColor: 'transparent' },
          text: { color: JournalTheme.colors.textSecondary },
        };
      case 'primary':
      default:
        return {
          btn: { backgroundColor: JournalTheme.colors.primary },
          text: { color: '#FFFFFF' },
        };
    }
  };

  const getSizeStyles = (): { btn: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          btn: { height: 36, paddingHorizontal: Spacing.three, borderRadius: JournalTheme.radii.sm },
          text: { fontSize: 13 },
        };
      case 'lg':
        return {
          btn: { height: 52, paddingHorizontal: Spacing.five, borderRadius: JournalTheme.radii.lg },
          text: { fontSize: 17 },
        };
      case 'md':
      default:
        return {
          btn: { height: 44, paddingHorizontal: Spacing.four, borderRadius: JournalTheme.radii.md },
          text: { fontSize: 15 },
        };
    }
  };

  const vStyles = getVariantStyles();
  const sStyles = getSizeStyles();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        vStyles.btn,
        sStyles.btn,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={vStyles.text.color} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, vStyles.text, sStyles.text, !!icon && styles.textWithIcon, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
  textWithIcon: {
    marginLeft: Spacing.one,
  },
});
