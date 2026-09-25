import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const COLORS = {
  lightBg: '#F6FBFD',
  darkBg: '#06121B',
  lightText: '#08233B',
  darkText: '#F5FBFF',
  lightSub: '#627B8D',
  darkSub: '#9CB7C8',
  blue: '#0EA5E9',
  cyan: '#22D3EE',
  teal: '#00D4C5',
  green: '#10B981',
};

const FLOATERS = [
  { icon: 'pulse-outline', x: 0.18, y: 0.30, delay: 0 },
  { icon: 'shield-checkmark-outline', x: 0.82, y: 0.30, delay: 120 },
  { icon: 'medkit-outline', x: 0.15, y: 0.55, delay: 240 },
  { icon: 'heart-outline', x: 0.85, y: 0.55, delay: 360 },
];

function FloatingIcon({ icon, x, y, delay, dark }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.72)).current;
  const lift = useRef(new Animated.Value(4)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 75,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(lift, {
            toValue: -3,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(lift, {
            toValue: 4,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }, delay);

    return () => {
      clearTimeout(timer);
      lift.stopAnimation();
    };
  }, [delay, lift, opacity, scale]);

  return (
    <Animated.View
      style={[
        styles.floatingIcon,
        {
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          opacity,
          transform: [{ translateY: lift }, { scale }],
          backgroundColor: dark ? 'rgba(11, 35, 48, 0.96)' : 'rgba(255,255,255,0.96)',
          borderColor: dark ? 'rgba(82,220,239,0.30)' : 'rgba(14,165,233,0.16)',
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={dark ? '#61DFF0' : COLORS.blue} />
    </Animated.View>
  );
}

export default function AnimatedSplashScreen({ ready = true, onFinish }) {
  const dark = useColorScheme() === 'dark';
  const { width, height } = useWindowDimensions();

  // Keep the background fully opaque until the splash is completely removed.
  // This prevents the Login/Home screen from showing through during the fade.
  const contentOpacity = useRef(new Animated.Value(1)).current;

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoY = useRef(new Animated.Value(12)).current;

  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.82)).current;
  const ringRotate = useRef(new Animated.Value(0)).current;

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(14)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(8)).current;

  const progress = useRef(new Animated.Value(0)).current;
  const progressShimmer = useRef(new Animated.Value(-1)).current;
  const statusOpacity = useRef(new Animated.Value(0)).current;

  const [sequenceReady, setSequenceReady] = useState(false);
  const [statusText, setStatusText] = useState('Preparing your health companion...');

  const trackWidth = Math.min(250, Math.max(190, width * 0.57));

  useEffect(() => {
    let mounted = true;
    const timers = [];

    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(logoY, {
        toValue: 0,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(180),
      Animated.parallel([
        Animated.timing(ringOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(ringScale, {
          toValue: 1,
          friction: 8,
          tension: 55,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Animated.loop(
      Animated.timing(ringRotate, {
        toValue: 1,
        duration: 7200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.sequence([
      Animated.delay(560),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 430,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(titleY, {
          toValue: 0,
          duration: 430,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(760),
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(taglineY, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(850),
      Animated.timing(progress, {
        toValue: 1,
        duration: 1700,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();

    Animated.timing(statusOpacity, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    timers.push(
      setTimeout(() => {
        if (mounted) setStatusText('Securing your session...');
      }, 950),
      setTimeout(() => {
        if (mounted) setStatusText('Preparing your health companion...');
      }, 1550),
      setTimeout(() => {
        if (mounted) setStatusText('Almost there...');
      }, 2250),
      setTimeout(() => {
        if (mounted) setSequenceReady(true);
      }, 2740),
    );

    const shimmer = Animated.loop(
      Animated.timing(progressShimmer, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    shimmer.start();

    return () => {
      mounted = false;
      timers.forEach(clearTimeout);
      shimmer.stop();
      ringRotate.stopAnimation();
      ringScale.stopAnimation();
      logoOpacity.stopAnimation();
      logoScale.stopAnimation();
      logoY.stopAnimation();
      titleOpacity.stopAnimation();
      titleY.stopAnimation();
      taglineOpacity.stopAnimation();
      taglineY.stopAnimation();
      progress.stopAnimation();
      progressShimmer.stopAnimation();
      statusOpacity.stopAnimation();
    };
  }, [
    logoOpacity,
    logoScale,
    logoY,
    progress,
    progressShimmer,
    ringOpacity,
    ringRotate,
    ringScale,
    statusOpacity,
    taglineOpacity,
    taglineY,
    titleOpacity,
    titleY,
  ]);

  useEffect(() => {
    if (!ready || !sequenceReady) return undefined;

    const timer = setTimeout(() => {
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 330,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onFinish?.();
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [contentOpacity, onFinish, ready, sequenceReady]);

  const ringRotation = ringRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const counterRotation = ringRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const shimmerTranslate = progressShimmer.interpolate({
    inputRange: [-1, 1],
    outputRange: [-70, trackWidth + 70],
  });

  return (
    <View
      style={[
        styles.root,
        {
          width,
          height,
          backgroundColor: dark ? COLORS.darkBg : COLORS.lightBg,
        },
      ]}
    >
      <StatusBar
        translucent={false}
        backgroundColor={dark ? COLORS.darkBg : COLORS.lightBg}
        barStyle={dark ? 'light-content' : 'dark-content'}
      />

      <Animated.View
        style={[
          styles.content,
          { opacity: contentOpacity },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.centerGlow,
            {
              backgroundColor: dark
                ? 'rgba(34,211,238,0.08)'
                : 'rgba(14,165,233,0.06)',
            },
          ]}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.ringOuter,
            {
              opacity: ringOpacity,
              transform: [
                { scale: ringScale },
                { rotate: ringRotation },
              ],
              borderColor: dark
                ? 'rgba(78,220,240,0.24)'
                : 'rgba(14,165,233,0.15)',
            },
          ]}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.ringInner,
            {
              opacity: Animated.multiply(ringOpacity, 0.72),
              transform: [
                { scale: Animated.multiply(ringScale, 0.91) },
                { rotate: counterRotation },
              ],
              borderColor: dark
                ? 'rgba(16,185,129,0.24)'
                : 'rgba(16,185,129,0.12)',
            },
          ]}
        />

        {FLOATERS.map(item => (
          <FloatingIcon
            key={`${item.icon}-${item.delay}`}
            {...item}
            dark={dark}
          />
        ))}

        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: logoOpacity,
              transform: [
                { translateY: logoY },
                { scale: logoScale },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.logoCard,
              {
                borderColor: dark
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(14,165,233,0.10)',
              },
            ]}
          >
            <Image
              source={require('../../assets/images/caresense-logo-transparent.png')}
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
              color: dark ? COLORS.darkText : COLORS.lightText,
            },
          ]}
        >
          <Text style={{ color: dark ? COLORS.darkText : COLORS.lightText }}>
            Care
          </Text>
          <Text style={{ color: dark ? '#43D9EF' : COLORS.teal }}>
            Sense
          </Text>
          <Text style={{ color: dark ? COLORS.darkText : COLORS.lightText }}>
            {' AI'}
          </Text>
        </Animated.Text>

        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineY }],
              color: dark ? COLORS.darkSub : COLORS.lightSub,
            },
          ]}
        >
          Your Health, Smarter Decisions
        </Animated.Text>

        <Animated.View
          style={[
            styles.pulseAccent,
            { opacity: taglineOpacity },
          ]}
        >
          <View
            style={[
              styles.pulseLine,
              { backgroundColor: dark ? COLORS.cyan : COLORS.teal },
            ]}
          />
          <View
            style={[
              styles.pulsePoint,
              { backgroundColor: dark ? COLORS.cyan : COLORS.teal },
            ]}
          />
          <View
            style={[
              styles.pulseLine,
              styles.pulseLineRight,
              { backgroundColor: dark ? COLORS.cyan : COLORS.teal },
            ]}
          />
        </Animated.View>

        <View
          style={[
            styles.progressTrack,
            {
              width: trackWidth,
              backgroundColor: dark
                ? 'rgba(156,183,200,0.14)'
                : 'rgba(98,123,141,0.13)',
            },
          ]}
        >
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [5, trackWidth],
                }),
                backgroundColor: dark ? COLORS.cyan : COLORS.teal,
              },
            ]}
          />

          <Animated.View
            pointerEvents="none"
            style={[
              styles.shimmer,
              {
                transform: [{ translateX: shimmerTranslate }],
              },
            ]}
          />
        </View>

        <Animated.Text
          style={[
            styles.statusText,
            {
              opacity: statusOpacity,
              color: dark ? COLORS.darkSub : COLORS.lightSub,
            },
          ]}
        >
          {statusText}
        </Animated.Text>

        <Text
          style={[
            styles.footer,
            { color: dark ? '#7897A8' : '#718896' },
          ]}
        >
          Analyze  •  Understand  •  Care
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  content: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerGlow: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
  },

  ringOuter: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1.5,
  },

  ringInner: {
    position: 'absolute',
    width: 242,
    height: 242,
    borderRadius: 121,
    borderWidth: 1.2,
    borderStyle: 'dashed',
  },

  floatingIcon: {
    position: 'absolute',
    width: 46,
    height: 46,
    marginLeft: -23,
    marginTop: -23,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoCard: {
    width: 158,
    height: 158,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    width: 138,
    height: 138,
  },

  title: {
    marginTop: 23,
    fontSize: 35,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: -0.9,
  },

  tagline: {
    marginTop: 7,
    fontSize: 15.5,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  pulseAccent: {
    width: 102,
    height: 20,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  pulseLine: {
    width: 31,
    height: 2,
    transform: [{ rotate: '-27deg' }],
  },

  pulseLineRight: {
    transform: [{ rotate: '27deg' }],
  },

  pulsePoint: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginHorizontal: 2,
  },

  progressTrack: {
    height: 6,
    marginTop: 18,
    borderRadius: 6,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 6,
  },

  shimmer: {
    position: 'absolute',
    top: 0,
    width: 42,
    height: '100%',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.58)',
    transform: [{ skewX: '-16deg' }],
  },

  statusText: {
    marginTop: 9,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  footer: {
    position: 'absolute',
    bottom: 42,
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1.05,
  },
});
