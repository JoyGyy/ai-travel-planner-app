import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, ViewStyle } from 'react-native';
import { JournalTheme } from '@/constants/theme';

export interface StampBadgeProps {
  label: string;
  type?: 'visited' | 'planned' | 'must-go' | 'custom';
  color?: 'red' | 'blue' | 'accent' | 'primary';
  rotation?: number;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  style?: ViewStyle;
}

/**
 * 手账复古印章徽章组件
 * 模拟盖在纸上的图章印迹
 */
export function StampBadge({
  label,
  color = 'red',
  rotation = -8,
  size = 'md',
  animated = false,
  style,
}: StampBadgeProps) {
  const [scaleAnim] = useState(() => new Animated.Value(animated ? 1.5 : 1));
  const [opacityAnim] = useState(() => new Animated.Value(animated ? 0.3 : 1));

  useEffect(() => {
    if (animated) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [animated, scaleAnim, opacityAnim]);

  const getStampColor = () => {
    switch (color) {
      case 'blue':
        return JournalTheme.colors.stampBlue;
      case 'accent':
        return JournalTheme.colors.accent;
      case 'primary':
        return JournalTheme.colors.primary;
      case 'red':
      default:
        return JournalTheme.colors.stampRed;
    }
  };

  const stampColor = getStampColor();

  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return {
          paddingVertical: 2,
          paddingHorizontal: 6,
          fontSize: 10,
          borderWidth: 1,
        };
      case 'lg':
        return {
          paddingVertical: 6,
          paddingHorizontal: 16,
          fontSize: 14,
          borderWidth: 2,
        };
      case 'md':
      default:
        return {
          paddingVertical: 4,
          paddingHorizontal: 10,
          fontSize: 12,
          borderWidth: 1.5,
        };
    }
  };

  const dim = getDimensions();

  return (
    <Animated.View
      style={[
        styles.stamp,
        {
          borderColor: stampColor,
          borderWidth: dim.borderWidth,
          paddingVertical: dim.paddingVertical,
          paddingHorizontal: dim.paddingHorizontal,
          opacity: opacityAnim,
          transform: [{ rotate: `${rotation}deg` }, { scale: scaleAnim }],
        },
        style,
      ]}
    >
      <Text
        style={[styles.text, { color: stampColor, fontSize: dim.fontSize }]}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stamp: {
    alignSelf: 'flex-start',
    borderRadius: JournalTheme.radii.sm,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  text: {
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
