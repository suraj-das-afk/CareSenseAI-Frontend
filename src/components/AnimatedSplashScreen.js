import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

const BRAND = {
  blue: '#0EA5E9',
  green: '#10B981',
  cyan: '#22D3EE',
  navy: '#071726',
  bg: '#EAF7FF',
};

const FLOATERS = [
  { icon: 'heart-outline', x: -115, y: -145, size: 22, delay: 0 },
  { icon: 'medkit-outline', x: 118, y: -125, size: 23, delay: 120 },
  { icon: 'fitness-outline', x: -135, y: 72, size: 21, delay: 240 },
  { icon: 'shield-checkmark-outline', x: 134, y: 80, size: 22, delay: 360 },
  { icon: 'pulse-outline', x: -60, y: 152, size: 20, delay: 480 },
  { icon: 'add-circle-outline', x: 72, y: 150, size: 18, delay: 600 },
];

function FloatingIcon({ item, start }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.65)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!start) return;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, item.delay);
    return () => clearTimeout(timer);
  }, [item.delay, opacity, scale, start, translateY]);

  return (
    <Animated.View
      style={[
        styles.floatingIcon,
        {
          left: width / 2 + item.x - item.size,
          top: height * 0.36 + item.y - item.size,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <Ionicons name={item.icon} size={item.size} color={BRAND.blue} />
    </Animated.View>
  );
}

export default function AnimatedSplashScreen({ ready, onFinish }) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.55)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(18)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(12)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  const [animationDone, setAnimationDone] = React.useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(ringOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.spring(ringScale, {
          toValue: 1,
          friction: 8,
          tension: 55,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(160),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(titleY, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(taglineY, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 1,
          duration: 950,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
    ]).start(({ finished }) => {
      if (finished) setAnimationDone(true);
    });
  }, [
    logoOpacity,
    logoScale,
    ringOpacity,
    ringScale,
    titleOpacity,
    titleY,
    taglineOpacity,
    taglineY,
    progress,
  ]);

  useEffect(() => {
    if (!ready || !animationDone) return;
    Animated.timing(fadeOut, {
      toValue: 0,
      duration: 420,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onFinish?.();
    });
  }, [animationDone, fadeOut, onFinish, ready]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]} pointerEvents="auto">
      <View style={styles.glow} />
      <Animated.View
        style={[
          styles.ring,
          {
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ringSmall,
          {
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />

      {FLOATERS.map((item) => (
        <FloatingIcon key={item.icon} item={item} start />
      ))}

      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <View style={styles.logoShadow}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      <Animated.Text
        style={[
          styles.title,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleY }],
          },
        ]}
      >
        <Text style={styles.titleDark}>Care</Text>
        <Text style={styles.titleBlue}>Sense</Text>
        <Text style={styles.titleDark}> AI</Text>
      </Animated.Text>

      <Animated.Text
        style={[
          styles.tagline,
          {
            opacity: taglineOpacity,
            transform: [{ translateY: taglineY }],
          },
        ]}
      >
        Smarter Care for a Healthier You
      </Animated.Text>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              transform: [
                {
                  scaleX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.02, 1],
                  }),
                },
              ],
            },
          ]}
        />
      </View>

      <Text style={styles.footer}>Analyze  •  Understand  •  Care</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.bg,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(14,165,233,0.10)',
  },
  ring: {
    position: 'absolute',
    width: 290,
    height: 290,
    borderRadius: 145,
    borderWidth: 2,
    borderColor: 'rgba(14,165,233,0.22)',
  },
  ringSmall: {
    position: 'absolute',
    width: 195,
    height: 195,
    borderRadius: 98,
    borderWidth: 2,
    borderColor: 'rgba(16,185,129,0.18)',
  },
  floatingIcon: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.12)',
    shadowColor: '#0EA5E9',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  logoWrap: {
    width: 178,
    height: 178,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoShadow: {
    width: 160,
    height: 160,
    borderRadius: 40,
    shadowColor: '#0EA5E9',
    shadowOpacity: 0.24,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  title: {
    marginTop: 24,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  titleDark: {
    color: '#0B2340',
  },
  titleBlue: {
    color: BRAND.blue,
  },
  tagline: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '500',
    color: '#42647F',
  },
  progressTrack: {
    width: 190,
    height: 6,
    marginTop: 24,
    borderRadius: 3,
    backgroundColor: 'rgba(14,165,233,0.16)',
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
    backgroundColor: BRAND.cyan,
    transformOrigin: 'left center',
  },
  footer: {
    position: 'absolute',
    bottom: Math.max(32, height * 0.06),
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: '#5B7892',
  },
});
