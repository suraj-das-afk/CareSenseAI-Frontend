import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const COLORS = {
  lightBg: '#F0FAFF',
  darkBg: '#07131C',
  lightText: '#09233D',
  darkText: '#F5FBFF',
  lightSub: '#58738A',
  darkSub: '#9AB6C7',
  blue: '#0EA5E9',
  cyan: '#22D3EE',
  green: '#10B981',
};

const FLOATERS = [
  ['heart-outline', 0.20, 0.23, 80],
  ['medkit-outline', 0.80, 0.25, 220],
  ['pulse-outline', 0.16, 0.48, 360],
  ['shield-checkmark-outline', 0.84, 0.50, 500],
  ['add-circle-outline', 0.29, 0.66, 640],
  ['fitness-outline', 0.71, 0.66, 780],
];

function FloatingIcon({ name, left, top, delay, dark }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const enter = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(bob, {
            toValue: 1,
            duration: 1300,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(bob, {
            toValue: 0,
            duration: 1300,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, delay);

    return () => clearTimeout(enter);
  }, [delay, bob, opacity, scale]);

  return (
    <Animated.View
      style={[
        styles.floating,
        {
          left: `${left * 100}%`,
          top: `${top * 100}%`,
          backgroundColor: dark ? '#112A38' : '#FFFFFF',
          borderColor: dark ? 'rgba(94,220,245,0.28)' : 'rgba(14,165,233,0.14)',
          opacity,
          transform: [
            { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
            { scale },
          ],
        },
      ]}
    >
      <Ionicons name={name} size={22} color={dark ? '#54DDF4' : COLORS.blue} />
    </Animated.View>
  );
}

export default function AnimatedSplashScreen({
  ready = false,
  onFinish,
}) {
  const dark = useColorScheme() === 'dark';
  const { width, height } = useWindowDimensions();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.80)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.65)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const splashStartedAt = useRef(Date.now()).current;
  const finishTimerRef = useRef(null);
  const finishStartedRef = useRef(false);

  useEffect(() => {
    const heartbeat = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.045, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 180, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.065, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(550),
      ])
    );

    Animated.parallel([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(280),
        Animated.parallel([
          Animated.timing(ringOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
          Animated.spring(ringScale, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(820),
        Animated.parallel([
          Animated.timing(titleOpacity, { toValue: 1, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(titleY, { toValue: 0, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(1100),
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 430, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(progress, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      ]),
    ]).start();

    heartbeat.start();

    return () => {
      heartbeat.stop();
    };
  }, [fadeOut, logoOpacity, logoScale, onFinish, progress, pulse, ringOpacity, ringScale, subtitleOpacity, titleOpacity, titleY]);

  useEffect(() => {
  if (!ready || finishStartedRef.current) {
    return;
  }

  const elapsed =
    Date.now() - splashStartedAt;

  const minimumDuration = 4200;

  const remaining =
    Math.max(
      0,
      minimumDuration - elapsed,
    );

  finishTimerRef.current =
    setTimeout(() => {
      if (finishStartedRef.current) {
        return;
      }

      finishStartedRef.current = true;

      Animated.timing(
        fadeOut,
        {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(
            Easing.cubic,
          ),
          useNativeDriver: true,
        },
      ).start(({ finished }) => {
        if (finished) {
          onFinish?.();
        }
      });
    }, remaining);

  return () => {
    if (finishTimerRef.current) {
      clearTimeout(
        finishTimerRef.current,
      );
      finishTimerRef.current = null;
    }
  };
}, [
  ready,
  fadeOut,
  onFinish,
  splashStartedAt,
]);

  const trackWidth = Math.min(230, Math.max(175, width * 0.52));

  return (
    <Animated.View
      style={[
        styles.root,
        { width, height, backgroundColor: dark ? COLORS.darkBg : COLORS.lightBg, opacity: fadeOut },
      ]}
    >
      <View style={[styles.glow, { backgroundColor: dark ? 'rgba(14,165,233,0.10)' : 'rgba(14,165,233,0.12)' }]} />

      <Animated.View
        style={[
          styles.ringOuter,
          {
            opacity: ringOpacity,
            borderColor: dark ? 'rgba(74,213,244,0.23)' : 'rgba(14,165,233,0.18)',
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ringInner,
          {
            opacity: ringOpacity,
            borderColor: dark ? 'rgba(16,185,129,0.24)' : 'rgba(16,185,129,0.16)',
            transform: [{ scale: ringScale }],
          },
        ]}
      />

      {FLOATERS.map(([name, left, top, delay]) => (
        <FloatingIcon
          key={`${name}-${delay}`}
          name={name}
          left={left}
          top={top}
          delay={delay}
          dark={dark}
        />
      ))}

      <Animated.View
        style={[
          styles.logoStage,
          {
            opacity: logoOpacity,
            transform: [{ scale: Animated.multiply(logoScale, pulse) }],
          },
        ]}
      >
        <View style={[styles.logoCard, { shadowColor: dark ? '#000000' : COLORS.blue }]}>
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
          { color: dark ? COLORS.darkText : COLORS.lightText, opacity: titleOpacity, transform: [{ translateY: titleY }] },
        ]}
      >
        <Text style={{ color: dark ? COLORS.darkText : COLORS.lightText }}>Care</Text>
        <Text style={{ color: dark ? '#49D3EE' : COLORS.blue }}>Sense</Text>
        <Text style={{ color: dark ? COLORS.darkText : COLORS.lightText }}> AI</Text>
      </Animated.Text>

      <Animated.Text
        style={[styles.subtitle, { color: dark ? COLORS.darkSub : COLORS.lightSub, opacity: subtitleOpacity }]}
      >
        Smarter Care for a Healthier You
      </Animated.Text>

      <View style={[styles.progressTrack, { width: trackWidth }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progress.interpolate({ inputRange: [0, 1], outputRange: [4, trackWidth] }),
              backgroundColor: dark ? COLORS.cyan : COLORS.blue,
            },
          ]}
        />
      </View>

      <Text style={[styles.footer, { color: dark ? '#82A4B9' : '#68839A' }]}>
        Analyze  •  Understand  •  Care
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, top: 0, zIndex: 9999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', width: 430, height: 430, borderRadius: 215 },
  ringOuter: { position: 'absolute', width: 360, height: 360, borderRadius: 180, borderWidth: 2 },
  ringInner: { position: 'absolute', width: 250, height: 250, borderRadius: 125, borderWidth: 2 },
  floating: { position: 'absolute', width: 48, height: 48, marginLeft: -24, marginTop: -24, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  logoStage: { alignItems: 'center', justifyContent: 'center' },
  logoCard: { width: 180, height: 180, borderRadius: 42, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 10, shadowOpacity: 0.20, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  logo: { width: 150, height: 150 },
  title: { marginTop: 26, fontSize: 35, lineHeight: 42, fontWeight: '800', letterSpacing: -0.9 },
  subtitle: { marginTop: 7, fontSize: 16, lineHeight: 21, fontWeight: '500' },
  progressTrack: { height: 7, marginTop: 26, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(105,154,184,0.18)' },
  progressFill: { height: '100%', borderRadius: 4 },
  footer: { position: 'absolute', bottom: 52, fontSize: 12, fontWeight: '700', letterSpacing: 1.15 },
});
