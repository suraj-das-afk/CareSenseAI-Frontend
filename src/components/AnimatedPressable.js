import React, { useRef } from 'react';
import { Animated, Pressable } from 'react-native';

export default function AnimatedPressable({ children, onPress, style, scaleTo = 0.96, ...props }) {
  const animatedScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(animatedScale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(animatedScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} {...props}>
      <Animated.View style={[style, { transform: [{ scale: animatedScale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}