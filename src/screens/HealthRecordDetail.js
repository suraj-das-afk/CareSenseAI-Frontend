import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Animated,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { AuthContext } from '../context/AuthContext';
import { PopupContext } from '../context/PopupContext';
import { openPDFReport } from '../services/api';


/* ============================================================
   CONSTANTS
============================================================ */

const EMERGENCY_NUMBER = '112';


/* ============================================================
   HELPERS
============================================================ */

function asArray(value) {
  return Array.isArray(value) ? value : [];
}


function asObject(value) {
  return value &&
    typeof value === 'object' &&
    !Array.isArray(value)
    ? value
    : {};
}


function humanizeText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(
      /\b\w/g,
      char => char.toUpperCase()
    );
}


function formatConfidence(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return '—';
  }

  const safe = Math.max(
    0,
    Math.min(100, numeric)
  );

  return Number.isInteger(safe)
    ? `${safe}%`
    : `${safe.toFixed(1)}%`;
}


function clampPercentage(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, numeric)
  );
}


function getConditionDescription(
  condition
) {
  const normalized = String(
    condition || ''
  ).toLowerCase();

  if (
    normalized.includes(
      'myocardial'
    ) ||
    normalized.includes(
      'heart attack'
    )
  ) {
    return 'A possible heart-related condition';
  }

  if (
    normalized.includes(
      'chikungunya'
    )
  ) {
    return 'A possible mosquito-borne viral illness';
  }

  if (
    normalized.includes(
      'dengue'
    )
  ) {
    return 'A possible mosquito-borne viral illness';
  }

  if (
    normalized.includes(
      'malaria'
    )
  ) {
    return 'A possible mosquito-borne infection';
  }

  if (
    normalized.includes(
      'influenza'
    ) ||
    normalized === 'flu'
  ) {
    return 'A possible viral respiratory illness';
  }

  if (
    normalized.includes(
      'covid'
    )
  ) {
    return 'A possible respiratory viral illness';
  }

  if (
    normalized.includes(
      'common cold'
    )
  ) {
    return 'A possible upper respiratory infection pattern';
  }

  if (
    normalized.includes(
      'migraine'
    )
  ) {
    return 'A possible headache pattern';
  }

  return 'A possible explanation for your symptoms';
}


function getTriagePresentation(
  triageLevel,
  colors
) {
  const normalized = String(
    triageLevel || ''
  ).toUpperCase();

  if (normalized === 'EMERGENCY') {
    return {
      key: 'EMERGENCY',
      eyebrow: 'URGENT ACTION',
      title: 'Get help right now',
      description:
        'The information you entered includes a pattern that may require immediate medical attention. Do not delay professional evaluation.',
      icon: 'warning-outline',
      color: colors.danger,
      soft: colors.dangerSoft,
      border: colors.dangerBorder,
      text: colors.dangerText,
    };
  }

  if (normalized === 'URGENT') {
    return {
      key: 'URGENT',
      eyebrow: 'MEDICAL ATTENTION',
      title: 'Get medical help soon',
      description:
        'Your symptoms may need timely assessment by a healthcare professional, especially if they worsen or new severe symptoms appear.',
      icon: 'time-outline',
      color: colors.warning,
      soft: colors.warningSoft,
      border: colors.warningBorder,
      text: colors.warningText,
    };
  }

  return {
    key: 'ROUTINE',
    eyebrow: 'ASSESSMENT COMPLETE',
    title: 'No emergency pattern detected',
    description:
      'Based on the information provided, the current assessment does not indicate an emergency pattern. Keep monitoring your symptoms and follow the guidance below.',
    icon: 'checkmark-circle-outline',
    color: colors.success,
    soft: colors.successSoft,
    border: colors.successBorder,
    text: colors.successText,
  };
}


/* ============================================================
   MAIN SCREEN
============================================================ */

export default function HealthRecordDetail({
  route,
  navigation,
}) {
  const authContext =
    useContext(AuthContext) || {};

  const {
    isDarkMode,
  } = authContext;

  const {
    showPopup,
  } = useContext(
    PopupContext,
  ) || {};

  const isDark = Boolean(
    isDarkMode
  );

  const insets =
    useSafeAreaInsets();

  const result =
    route?.params?.result || {};

  /* ==========================================================
     THEME
  ========================================================== */

  const colors = useMemo(
    () => ({
      background: isDark
        ? '#0A0F1A'
        : '#F7F9FC',

      surface: isDark
        ? '#101722'
        : '#FFFFFF',

      card: isDark
        ? '#141C29'
        : '#FFFFFF',

      cardAlt: isDark
        ? '#111827'
        : '#F8FAFC',

      input: isDark
        ? '#0F1722'
        : '#FFFFFF',

      border: isDark
        ? '#243044'
        : '#E2E8F0',

      borderSoft: isDark
        ? '#1B2636'
        : '#EEF2F7',

      text: isDark
        ? '#F8FAFC'
        : '#111827',

      secondary: isDark
        ? '#94A3B8'
        : '#64748B',

      muted: isDark
        ? '#64748B'
        : '#94A3B8',

      accent: '#00D4C5',

      accentSoft: isDark
        ? '#0E282D'
        : '#E8FBF8',

      accentBorder: isDark
        ? '#1B4746'
        : '#B8EEE8',

      accentText: isDark
        ? '#8FF7ED'
        : '#007F77',

      danger: '#EF4444',

      dangerSoft: isDark
        ? '#32171C'
        : '#FFF1F2',

      dangerBorder: isDark
        ? '#642A31'
        : '#FECDD3',

      dangerText: isDark
        ? '#FDA4AF'
        : '#BE123C',

      warning: '#F59E0B',

      warningSoft: isDark
        ? '#30240F'
        : '#FFFBEB',

      warningBorder: isDark
        ? '#604817'
        : '#FDE68A',

      warningText: isDark
        ? '#FCD34D'
        : '#B45309',

      success: '#00A878',

      successSoft: isDark
        ? '#10352B'
        : '#E8F8F3',

      successBorder: isDark
        ? '#246A58'
        : '#BCEBDD',

      successText: isDark
        ? '#7DE3C8'
        : '#087F68',

      shadow: isDark
        ? '#000000'
        : '#64748B',
    }),
    [isDark]
  );


  /* ==========================================================
     RESULT DATA
  ========================================================== */

  const triageLevel = String(
    result?.triage_level || 'ROUTINE'
  ).toUpperCase();

  const triage =
    getTriagePresentation(
      triageLevel,
      colors
    );

  const isEmergency =
    triage.key === 'EMERGENCY';

  const isUrgent =
    triage.key === 'URGENT';

  const isRoutine =
    triage.key === 'ROUTINE';

  const isInsufficient =
    result?.needs_clarification === true;

  const topDiseases =
    asArray(result?.top_diseases);

  const significantDiseases =
    topDiseases
      .filter(item => {
        const confidence =
          Number(
            item?.confidence || 0
          );

        return (
          Number.isFinite(confidence) &&
          confidence >= 5
        );
      })
      .slice(0, 3);

  const differentials =
    asArray(result?.differentials)
      .slice(0, 3);

  const warnings =
    asArray(result?.warnings);

  const uncertainty =
    asObject(result?.uncertainty);

  const medicines =
    asArray(result?.medicines);

  const interactions =
    asArray(
      result?.drug_interactions
    );

  const followUp =
    asObject(result?.follow_up);

  const auditId =
    result?.audit_id ||
    result?.id ||
    null;

  const missingSymptoms =
    asArray(
      uncertainty?.missing_symptoms
    );

  const hasExtraDetails =
    medicines.length > 0 ||
    interactions.length > 0 ||
    Boolean(result?.fda_warning) ||
    warnings.length > 0;

  const hasFollowUp =
    Object.keys(followUp).length >
    0;

  const aiSummary =
    result?.ai_summary ||
    result?.explanation ||
    '';

  /* ==========================================================
     LOCAL STATE
  ========================================================== */

  const [saved, setSaved] =
    useState(false);

  const [
    understoodUrgency,
    setUnderstoodUrgency,
  ] = useState(false);

  const [
    showMoreDetails,
    setShowMoreDetails,
  ] = useState(false);

  const [
    showWhyDetails,
    setShowWhyDetails,
  ] = useState(false);


  /* ==========================================================
     SCREEN ANIMATION
  ========================================================== */

  const fadeAnim =
    useRef(
      new Animated.Value(0)
    ).current;

  const slideAnim =
    useRef(
      new Animated.Value(18)
    ).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(18);

    const animation =
      Animated.parallel([
        Animated.timing(
          fadeAnim,
          {
            toValue: 1,
            duration: 380,
            useNativeDriver: true,
          }
        ),
        Animated.spring(
          slideAnim,
          {
            toValue: 0,
            friction: 8,
            tension: 42,
            useNativeDriver: true,
          }
        ),
      ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [
    fadeAnim,
    slideAnim,
    result?.id,
    result?.audit_id,
  ]);


  const animatedContentStyle = [
    styles.scroll,
    {
      opacity: fadeAnim,
      transform: [
        {
          translateY: slideAnim,
        },
      ],
    },
  ];


  /* ==========================================================
     ACTIONS
  ========================================================== */

  const handleGoBack =
    useCallback(() => {
      if (
        navigation?.canGoBack?.()
      ) {
        navigation.goBack();
      }
    }, [navigation]);


  const handleSave =
    useCallback(() => {
      setSaved(true);

      showPopup?.(
        'Assessment saved',
        'This assessment is already stored in your CareSense health records.',
        'success',
      );
    }, [
      showPopup,
    ]);


  const handleDownloadPDF =
    useCallback(async () => {
      const recordId =
        auditId ||
        result?.id;

      if (!recordId) {
        showPopup?.(
          'Report unavailable',
          'This assessment does not have a record ID yet.',
          'warning',
        );

        return;
      }

      try {
        await openPDFReport(
          recordId,
        );
      } catch (error) {
        console.error(
          'PDF report error:',
          error,
        );

        showPopup?.(
          'Report unavailable',
          error?.message ||
            'Unable to open this report right now. Please try again.',
          'error',
        );
      }
    }, [
      auditId,
      result?.id,
      showPopup,
    ]);


  const handleEmergencyCall =
    useCallback(async () => {
      const url =
        `tel:${EMERGENCY_NUMBER}`;

      try {
        const supported =
          await Linking.canOpenURL(
            url,
          );

        if (!supported) {
          showPopup?.(
            'Emergency help',
            'Please use your local emergency service number immediately.',
            'warning',
          );

          return;
        }

        await Linking.openURL(
          url,
        );
      } catch (error) {
        console.error(
          'Emergency call error:',
          error,
        );

        showPopup?.(
          'Emergency help',
          'Please call your local emergency service immediately.',
          'error',
        );
      }
    }, [
      showPopup,
    ]);


  /* ==========================================================
     NEXT STEPS
  ========================================================== */

  const nextSteps = useMemo(() => {
    if (isEmergency) {
      return [
        'Contact emergency services or go to the nearest emergency department now.',
        'Do not drive yourself if you feel severely unwell, faint, confused, or unsafe to travel alone.',
        'Stay with someone you trust while arranging medical help when possible.',
      ];
    }

    if (isUrgent) {
      return [
        'Contact a doctor, urgent-care service, or other qualified healthcare professional soon.',
        'Monitor your symptoms closely and follow any professional advice you receive.',
        'Seek emergency care immediately if symptoms become severe or a new emergency warning sign appears.',
      ];
    }

    return [
      'Follow the care guidance shown in this result.',
      'Keep monitoring how your symptoms change over time.',
      'Contact a healthcare professional if symptoms persist, worsen, or become concerning.',
    ];
  }, [
    isEmergency,
    isUrgent,
  ]);


  /* ==========================================================
     SAFE SCROLL PROPS
  ========================================================== */

  const scrollContentStyle = [
    styles.content,
    {
      paddingBottom:
        Math.max(
          insets.bottom + 42,
          58
        ),
    },
  ];


  /* ==========================================================
     INSUFFICIENT INFORMATION
  ========================================================== */

  if (isInsufficient) {
    return (
      <SafeAreaView
        edges={['top']}
        style={[
          styles.root,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <StatusBar
          barStyle={
            isDark
              ? 'light-content'
              : 'dark-content'
          }
          backgroundColor={
            colors.background
          }
          translucent={false}
        />

        <Header
          navigation={navigation}
          colors={colors}
        />

        <Animated.ScrollView
          style={animatedContentStyle}
          contentContainerStyle={
            scrollContentStyle
          }
          showsVerticalScrollIndicator={false}
        >
          {/* HERO */}
          <View
            style={[
              styles.insufficientHero,
              {
                backgroundColor:
                  isDark
                    ? '#151529'
                    : '#F5F3FF',

                borderColor:
                  isDark
                    ? '#3C3970'
                    : '#DDD6FE',
              },
            ]}
          >
            <View
              style={
                styles.heroCenter
              }
            >
              <View
                style={[
                  styles.insufficientIcon,
                  {
                    backgroundColor:
                      isDark
                        ? '#2A2550'
                        : '#EDE9FE',
                  },
                ]}
              >
                <Ionicons
                  name="help-circle-outline"
                  size={34}
                  color="#7C3AED"
                />
              </View>

              <View
                style={[
                  styles.heroBadge,
                  {
                    backgroundColor:
                      isDark
                        ? '#30285C'
                        : '#EDE9FE',

                    borderColor:
                      isDark
                        ? '#4A4190'
                        : '#DDD6FE',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.heroBadgeText,
                    {
                      color: isDark
                        ? '#C4B5FD'
                        : '#6D28D9',
                    },
                  ]}
                >
                  MORE INFORMATION NEEDED
                </Text>
              </View>

              <Text
                style={[
                  styles.insufficientTitle,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                We need a little more information
              </Text>

              <Text
                style={[
                  styles.insufficientDescription,
                  {
                    color:
                      colors.secondary,
                  },
                ]}
              >
                The information entered is not specific enough
                to produce a reliable assessment yet. Adding a
                few more details is safer than guessing.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add more symptoms"
              onPress={handleGoBack}
              style={({ pressed }) => [
                styles.primaryAction,
                {
                  backgroundColor:
                    colors.accent,

                  shadowColor:
                    colors.accent,

                  opacity: pressed
                    ? 0.82
                    : 1,
                },
              ]}
            >
              <Ionicons
                name="arrow-back"
                size={19}
                color="#06110F"
              />

              <Text
                style={
                  styles.primaryActionText
                }
              >
                Add More Symptoms
              </Text>
            </Pressable>
          </View>


          <SectionCard
            colors={colors}
            icon="chatbubble-ellipses-outline"
            title="What this means"
          >
            <Text
              style={[
                styles.bodyText,
                {
                  color:
                    colors.secondary,
                },
              ]}
            >
              {aiSummary ||
                'The information entered was too general to confidently narrow down the possible causes.'}
            </Text>
          </SectionCard>


          <SectionCard
            colors={colors}
            icon="bulb-outline"
            title="How to improve the assessment"
          >
            <InfoBullet
              colors={colors}
              text="Tell us when the symptom started."
            />

            <InfoBullet
              colors={colors}
              text="Describe how severe it feels."
            />

            <InfoBullet
              colors={colors}
              text="Add other symptoms you are experiencing."
            />

            <InfoBullet
              colors={colors}
              text="Mention anything that makes the symptom better or worse."
            />
          </SectionCard>


          <SafetyNotice
            colors={colors}
          />
        </Animated.ScrollView>
      </SafeAreaView>
    );
  }


  /* ==========================================================
     NORMAL RESULT
  ========================================================== */

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.root,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      <StatusBar
        barStyle={
          isDark
            ? 'light-content'
            : 'dark-content'
        }
        backgroundColor={
          colors.background
        }
        translucent={false}
      />

      <Header
        navigation={navigation}
        colors={colors}
      />

      <Animated.ScrollView
        style={animatedContentStyle}
        contentContainerStyle={
          scrollContentStyle
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ==================================================
            HERO / TRIAGE
        ================================================== */}

        <View
          style={[
            styles.triageHero,
            {
              backgroundColor:
                triage.soft,

              borderColor:
                triage.border,
            },
          ]}
        >
          <View
            style={styles.triageHeroTop}
          >
            <View
              style={[
                styles.triageIcon,
                {
                  backgroundColor:
                    triage.color,
                },
              ]}
            >
              <Ionicons
                name={triage.icon}
                size={31}
                color="#FFFFFF"
              />
            </View>

            <View
              style={
                styles.triageHeroCopy
              }
            >
              <View
                style={[
                  styles.triageBadge,
                  {
                    backgroundColor:
                      triage.color,
                  },
                ]}
              >
                <Text
                  style={
                    styles.triageBadgeText
                  }
                >
                  {triage.key}
                </Text>
              </View>

              <Text
                style={[
                  styles.triageTitle,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                {triage.title}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.triageDescription,
              {
                color:
                  colors.secondary,
              },
            ]}
          >
            {triage.description}
          </Text>


          {/* EMERGENCY ACTIONS */}

          {isEmergency && (
            <View
              style={
                styles.emergencyActions
              }
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Call emergency services"
                onPress={
                  handleEmergencyCall
                }
                style={({ pressed }) => [
                  styles.emergencyButton,
                  {
                    backgroundColor:
                      colors.danger,

                    opacity: pressed
                      ? 0.84
                      : 1,
                  },
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={22}
                  color="#FFFFFF"
                />

                <View
                  style={
                    styles.emergencyButtonCopy
                  }
                >
                  <Text
                    style={
                      styles.emergencyButtonTitle
                    }
                  >
                    Call Emergency
                  </Text>

                  <Text
                    style={
                      styles.emergencyButtonSubtitle
                    }
                  >
                    Tap to call {EMERGENCY_NUMBER}
                  </Text>
                </View>

                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color="#FFFFFF"
                />
              </Pressable>


              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked:
                    understoodUrgency,
                }}
                onPress={() =>
                  setUnderstoodUrgency(
                    value => !value
                  )
                }
                style={({ pressed }) => [
                  styles.understandButton,
                  {
                    backgroundColor:
                      colors.card,

                    borderColor:
                      understoodUrgency
                        ? colors.danger
                        : colors.border,

                    opacity:
                      pressed
                        ? 0.82
                        : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor:
                        understoodUrgency
                          ? colors.danger
                          : colors.border,

                      backgroundColor:
                        understoodUrgency
                          ? colors.danger
                          : 'transparent',
                    },
                  ]}
                >
                  {understoodUrgency && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color="#FFFFFF"
                    />
                  )}
                </View>

                <Text
                  style={[
                    styles.understandText,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  I understand this may require
                  immediate medical attention.
                </Text>
              </Pressable>
            </View>
          )}
        </View>


        {/* ==================================================
            POSSIBLE CONDITIONS
        ================================================== */}

        {significantDiseases.length >
          0 && (
          <SectionCard
            colors={colors}
            icon="analytics-outline"
            title="Possible conditions"
            subtitle="These are possibilities generated from the information you provided — not diagnoses."
          >
            {significantDiseases.map(
              (disease, index) => (
                <ConditionItem
                  key={`${String(
                    disease?.condition ||
                      'condition'
                  )}-${index}`}
                  disease={disease}
                  index={index}
                  colors={colors}
                  isDark={isDark}
                  primary={
                    index === 0
                  }
                />
              )
            )}
          </SectionCard>
        )}


        {/* ==================================================
            SUMMARY
        ================================================== */}

        <SectionCard
          colors={colors}
          icon="chatbubble-ellipses-outline"
          title="What this means"
          subtitle="A plain-language summary of your assessment."
        >
          {aiSummary ? (
            <Text
              style={[
                styles.bodyText,
                {
                  color:
                    colors.secondary,
                },
              ]}
            >
              {aiSummary}
            </Text>
          ) : (
            <EmptyInlineMessage
              colors={colors}
              text="No additional summary was returned for this assessment."
            />
          )}

          <View
            style={[
              styles.infoBox,
              {
                backgroundColor:
                  colors.accentSoft,

                borderColor:
                  colors.accentBorder,
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={colors.accent}
            />

            <Text
              style={[
                styles.infoText,
                {
                  color:
                    colors.secondary,
                },
              ]}
            >
              CareSense AI is a decision-support tool.
              It does not replace a qualified healthcare
              professional or provide a diagnosis.
            </Text>
          </View>
        </SectionCard>


        {/* ==================================================
            WHY THIS RESULT
        ================================================== */}

        {(differentials.length >
          0 ||
          missingSymptoms.length >
            0) && (
          <SectionCard
            colors={colors}
            icon="git-compare-outline"
            title="Why this result?"
            subtitle="The assessment compares the symptoms you entered with patterns in the clinical system."
          >
            <ReasonSummary
              differentials={
                differentials
              }
              missingSymptoms={
                missingSymptoms
              }
              colors={colors}
            />

            {(differentials.some(
              item =>
                asArray(
                  item?.why
                ).length > 0 ||
                asArray(
                  item?.missing_keys
                ).length > 0
            ) ||
              missingSymptoms.length >
                0) && (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setShowWhyDetails(
                    value => !value
                  )
                }
                style={[
                  styles.expandButton,
                  {
                    backgroundColor:
                      colors.cardAlt,

                    borderColor:
                      colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.expandButtonText,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  {showWhyDetails
                    ? 'Hide detailed reasoning'
                    : 'View detailed reasoning'}
                </Text>

                <Ionicons
                  name={
                    showWhyDetails
                      ? 'chevron-up'
                      : 'chevron-down'
                  }
                  size={17}
                  color={
                    colors.secondary
                  }
                />
              </Pressable>
            )}

            {showWhyDetails && (
              <DetailedReasoning
                differentials={
                  differentials
                }
                missingSymptoms={
                  missingSymptoms
                }
                colors={colors}
              />
            )}
          </SectionCard>
        )}


        {/* ==================================================
            NEXT STEPS
        ================================================== */}

        <SectionCard
          colors={colors}
          icon="list-outline"
          title="What to do next"
          subtitle="Practical next steps based on the current triage level."
        >
          {nextSteps.map(
            (step, index) => (
              <StepItem
                key={`step-${index}`}
                number={index + 1}
                text={step}
                colors={colors}
              />
            )
          )}

          {result?.advice ? (
            <View
              style={[
                styles.adviceBox,
                {
                  backgroundColor:
                    colors.cardAlt,

                  borderColor:
                    colors.border,
                },
              ]}
            >
              <View
                style={
                  styles.adviceHeader
                }
              >
                <Ionicons
                  name="heart-outline"
                  size={17}
                  color={colors.accent}
                />

                <Text
                  style={[
                    styles.adviceLabel,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  Care guidance
                </Text>
              </View>

              <Text
                style={[
                  styles.bodyTextSmall,
                  {
                    color:
                      colors.secondary,
                  },
                ]}
              >
                {String(
                  result.advice
                )}
              </Text>
            </View>
          ) : null}
        </SectionCard>


        {/* ==================================================
            FOLLOW-UP
        ================================================== */}

        {hasFollowUp && (
          <SectionCard
            colors={colors}
            icon="calendar-outline"
            title="Follow-up guidance"
            subtitle="When to reassess or seek more help."
          >
            {followUp?.if_not_improved_24h ? (
              <FollowUpRow
                icon="time-outline"
                title="If you are not improving"
                text={
                  followUp.if_not_improved_24h
                }
                colors={colors}
              />
            ) : null}

            {followUp?.if_worsens ? (
              <FollowUpRow
                icon="trending-up-outline"
                title="If symptoms worsen"
                text={
                  followUp.if_worsens
                }
                colors={colors}
              />
            ) : null}

            {followUp?.red_flags ? (
              <FollowUpRow
                icon="warning-outline"
                title="Warning signs"
                text={
                  followUp.red_flags
                }
                colors={colors}
                danger
              />
            ) : null}
          </SectionCard>
        )}


        {/* ==================================================
            EXTRA DETAILS
        ================================================== */}

        {hasExtraDetails && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              expanded:
                showMoreDetails,
            }}
            onPress={() =>
              setShowMoreDetails(
                value => !value
              )
            }
            style={[
              styles.expandBar,
              {
                backgroundColor:
                  colors.card,

                borderColor:
                  colors.border,
              },
            ]}
          >
            <View
              style={
                styles.expandBarLeft
              }
            >
              <View
                style={[
                  styles.expandBarIcon,
                  {
                    backgroundColor:
                      colors.accentSoft,
                  },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={colors.accent}
                />
              </View>

              <View>
                <Text
                  style={[
                    styles.expandBarTitle,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  Extra safety details
                </Text>

                <Text
                  style={[
                    styles.expandBarSubtitle,
                    {
                      color:
                        colors.muted,
                    },
                  ]}
                >
                  Medicines, warnings and interactions
                </Text>
              </View>
            </View>

            <Ionicons
              name={
                showMoreDetails
                  ? 'chevron-up'
                  : 'chevron-down'
              }
              size={19}
              color={
                colors.secondary
              }
            />
          </Pressable>
        )}


        {showMoreDetails && (
          <View>
            {/* MEDICINES */}
            {medicines.length >
              0 && (
              <SectionCard
                colors={colors}
                icon="medkit-outline"
                title="Medication information"
                subtitle="Only medication information returned by the clinical system is displayed here."
              >
                {medicines.map(
                  (
                    medicine,
                    index
                  ) => {
                    const name =
                      medicine?.name ||
                      medicine?.medicine ||
                      medicine?.medication ||
                      'Medication';

                    const dosage =
                      medicine?.dosage ||
                      medicine?.dose ||
                      medicine?.instructions ||
                      '';

                    return (
                      <View
                        key={`${String(
                          name
                        )}-${index}`}
                        style={[
                          styles.medicineCard,
                          {
                            backgroundColor:
                              colors.cardAlt,

                            borderColor:
                              colors.border,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.medicineIcon,
                            {
                              backgroundColor:
                                colors.accentSoft,
                            },
                          ]}
                        >
                          <Ionicons
                            name="medical-outline"
                            size={19}
                            color={
                              colors.accent
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.medicineCopy
                          }
                        >
                          <Text
                            style={[
                              styles.medicineName,
                              {
                                color:
                                  colors.text,
                              },
                            ]}
                          >
                            {String(
                              name
                            )}
                          </Text>

                          {dosage ? (
                            <Text
                              style={[
                                styles.medicineDose,
                                {
                                  color:
                                    colors.secondary,
                                },
                              ]}
                            >
                              {String(
                                dosage
                              )}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  }
                )}

                <Text
                  style={[
                    styles.medicationSafetyText,
                    {
                      color:
                        colors.muted,
                    },
                  ]}
                >
                  Do not start, stop or change medicines
                  based only on this screen. Confirm
                  medication decisions with a qualified
                  professional.
                </Text>
              </SectionCard>
            )}


            {/* INTERACTIONS */}
            {interactions.length >
              0 && (
              <SectionCard
                colors={colors}
                icon="warning-outline"
                title="Medicine safety alerts"
              >
                {interactions.map(
                  (
                    interaction,
                    index
                  ) => (
                    <InfoBullet
                      key={`interaction-${index}`}
                      colors={colors}
                      text={String(
                        interaction
                      )}
                      danger
                    />
                  )
                )}
              </SectionCard>
            )}


            {/* FDA / MEDICATION WARNING */}
            {result?.fda_warning ? (
              <SectionCard
                colors={colors}
                icon="shield-checkmark-outline"
                title="Medicine warning"
              >
                <Text
                  style={[
                    styles.bodyTextSmall,
                    {
                      color:
                        colors.secondary,
                    },
                  ]}
                >
                  {String(
                    result.fda_warning
                  )}
                </Text>
              </SectionCard>
            ) : null}


            {/* GENERAL WARNINGS */}
            {warnings.length >
              0 && (
              <SectionCard
                colors={colors}
                icon="alert-circle-outline"
                title="Safety warnings"
              >
                {warnings.map(
                  (
                    warning,
                    index
                  ) => (
                    <InfoBullet
                      key={`warning-${index}`}
                      colors={colors}
                      text={String(
                        warning
                      )}
                      danger
                    />
                  )
                )}
              </SectionCard>
            )}
          </View>
        )}


        {/* ==================================================
            ACTIONS
        ================================================== */}

        <SectionCard
          colors={colors}
          icon="folder-open-outline"
          title="Save or export"
          subtitle="Keep a copy of your assessment for your records."
        >
          <Pressable
            accessibilityRole="button"
            onPress={
              handleDownloadPDF
            }
            style={({ pressed }) => [
              styles.primaryAction,
              {
                backgroundColor:
                  colors.accent,

                shadowColor:
                  colors.accent,

                opacity:
                  pressed
                    ? 0.82
                    : 1,
              },
            ]}
          >
            <View
              style={
                styles.primaryActionIcon
              }
            >
              <Ionicons
                name="document-text-outline"
                size={18}
                color="#06110F"
              />
            </View>

            <View
              style={
                styles.primaryActionCopy
              }
            >
              <Text
                style={
                  styles.primaryActionTitle
                }
              >
                Download Health Report
              </Text>

              <Text
                style={
                  styles.primaryActionSubtitle
                }
              >
                Open the detailed PDF report
              </Text>
            </View>

            <Ionicons
              name="arrow-forward"
              size={19}
              color="#06110F"
            />
          </Pressable>


          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: saved,
            }}
            disabled={saved}
            onPress={handleSave}
            style={({ pressed }) => [
              styles.secondaryAction,
              {
                backgroundColor:
                  colors.cardAlt,

                borderColor:
                  saved
                    ? colors.successBorder
                    : colors.border,

                opacity:
                  pressed
                    ? 0.78
                    : 1,
              },
            ]}
          >
            <View
              style={[
                styles.secondaryActionIcon,
                {
                  backgroundColor:
                    saved
                      ? colors.successSoft
                      : colors.iconBg,
                },
              ]}
            >
              <Ionicons
                name={
                  saved
                    ? 'bookmark'
                    : 'bookmark-outline'
                }
                size={18}
                color={
                  saved
                    ? colors.success
                    : colors.text
                }
              />
            </View>

            <View
              style={
                styles.primaryActionCopy
              }
            >
              <Text
                style={[
                  styles.secondaryActionTitle,
                  {
                    color:
                      saved
                        ? colors.successText
                        : colors.text,
                  },
                ]}
              >
                {saved
                  ? 'Assessment Saved'
                  : 'Save Assessment'}
              </Text>

              <Text
                style={[
                  styles.primaryActionSubtitle,
                  {
                    color:
                      colors.secondary,
                  },
                ]}
              >
                {saved
                  ? 'Already stored in your health records'
                  : 'Keep this assessment in your records'}
              </Text>
            </View>

            <Ionicons
              name={
                saved
                  ? 'checkmark-circle'
                  : 'chevron-forward'
              }
              size={19}
              color={
                saved
                  ? colors.success
                  : colors.muted
              }
            />
          </Pressable>
        </SectionCard>


        {/* ==================================================
            REFERENCE / FOOTER
        ================================================== */}

        {auditId && (
          <View
            style={[
              styles.referenceCard,
              {
                backgroundColor:
                  colors.cardAlt,

                borderColor:
                  colors.border,
              },
            ]}
          >
            <Ionicons
              name="finger-print-outline"
              size={16}
              color={colors.muted}
            />

            <Text
              style={[
                styles.referenceText,
                {
                  color:
                    colors.muted,
                },
              ]}
              numberOfLines={1}
            >
              Assessment reference: {String(
                auditId
              )}
            </Text>
          </View>
        )}


        <SafetyNotice
          colors={colors}
        />

        <View
          style={{
            height: 10,
          }}
        />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}


/* ============================================================
   HEADER
============================================================ */

function Header({
  navigation,
  colors,
}) {
  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor:
            colors.background,
          borderBottomColor:
            colors.borderSoft,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() =>
          navigation?.canGoBack?.()
            ? navigation.goBack()
            : null
        }
        style={({ pressed }) => [
          styles.headerButton,
          {
            backgroundColor:
              colors.card,

            borderColor:
              colors.border,

            opacity:
              pressed ? 0.72 : 1,
          },
        ]}
      >
        <Ionicons
          name="arrow-back"
          size={21}
          color={colors.text}
        />
      </Pressable>


      <View
        style={
          styles.headerCenter
        }
      >
        <Text
          style={[
            styles.headerTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          Health Result
        </Text>

        <Text
          style={[
            styles.headerSubtitle,
            {
              color:
                colors.muted,
            },
          ]}
        >
          CareSense AI assessment
        </Text>
      </View>


      <View
        style={[
          styles.headerBrandIcon,
          {
            backgroundColor:
              colors.accentSoft,

            borderColor:
              colors.accentBorder,
          },
        ]}
      >
        <Ionicons
          name="pulse-outline"
          size={18}
          color={colors.accent}
        />
      </View>
    </View>
  );
}


/* ============================================================
   SECTION CARD
============================================================ */

function SectionCard({
  colors,
  icon,
  title,
  subtitle,
  children,
}) {
  return (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor:
            colors.card,

          borderColor:
            colors.border,
        },
      ]}
    >
      <View
        style={
          styles.sectionHeader
        }
      >
        <View
          style={[
            styles.sectionIcon,
            {
              backgroundColor:
                colors.accentSoft,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={18}
            color={colors.accent}
          />
        </View>

        <View
          style={
            styles.sectionHeaderCopy
          }
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              style={[
                styles.sectionSubtitle,
                {
                  color:
                    colors.muted,
                },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {children}
    </View>
  );
}


/* ============================================================
   CONDITION ITEM
============================================================ */

function ConditionItem({
  disease,
  index,
  colors,
  isDark,
  primary,
}) {
  const confidence =
    clampPercentage(
      disease?.confidence
    );

  const name =
    humanizeText(
      disease?.condition
    ) || 'Possible condition';

  const description =
    getConditionDescription(
      disease?.condition
    );

  return (
    <View
      style={[
        styles.conditionCard,
        {
          backgroundColor:
            colors.cardAlt,

          borderColor:
            primary
              ? colors.accentBorder
              : colors.border,
        },
      ]}
    >
      <View
        style={
          styles.conditionTop
        }
      >
        <View
          style={[
            styles.conditionRank,
            {
              backgroundColor:
                primary
                  ? colors.accentSoft
                  : colors.iconBg,

              borderColor:
                primary
                  ? colors.accentBorder
                  : colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.conditionRankText,
              {
                color:
                  primary
                    ? colors.accentText
                    : colors.secondary,
              },
            ]}
          >
            {index + 1}
          </Text>
        </View>

        <View
          style={
            styles.conditionMain
          }
        >
          <View
            style={
              styles.conditionNameRow
            }
          >
            <Text
              style={[
                styles.conditionName,
                {
                  color:
                    colors.text,
                },
              ]}
              numberOfLines={2}
            >
              {name}
            </Text>

            <View
              style={[
                styles.confidenceBadge,
                {
                  backgroundColor:
                    primary
                      ? colors.accentSoft
                      : colors.iconBg,

                  borderColor:
                    primary
                      ? colors.accentBorder
                      : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.confidenceText,
                  {
                    color:
                      primary
                        ? colors.accentText
                        : colors.secondary,
                  },
                ]}
              >
                {formatConfidence(
                  confidence
                )}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.conditionDescription,
              {
                color:
                  colors.secondary,
              },
            ]}
          >
            {description}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.confidenceTrack,
          {
            backgroundColor:
              isDark
                ? '#1B2432'
                : '#E9EEF4',
          },
        ]}
      >
        <View
          style={[
            styles.confidenceFill,
            {
              width:
                `${confidence}%`,

              backgroundColor:
                primary
                  ? colors.accent
                  : colors.secondary,
            },
          ]}
        />
      </View>
    </View>
  );
}


/* ============================================================
   REASON SUMMARY
============================================================ */

function ReasonSummary({
  differentials,
  missingSymptoms,
  colors,
}) {
  const first =
    differentials[0] ||
    {};

  const why =
    asArray(first?.why)
      .slice(0, 3);

  const missing =
    asArray(
      first?.missing_keys
    )
      .slice(0, 3);

  if (
    why.length === 0 &&
    missing.length === 0 &&
    missingSymptoms.length === 0
  ) {
    return (
      <EmptyInlineMessage
        colors={colors}
        text="The system did not return additional reasoning details for this assessment."
      />
    );
  }

  return (
    <View>
      {why.length > 0 && (
        <View
          style={[
            styles.reasonSummaryBox,
            {
              backgroundColor:
                colors.successSoft,

              borderColor:
                colors.successBorder,
            },
          ]}
        >
          <View
            style={
              styles.reasonSummaryHeader
            }
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color={colors.success}
            />

            <Text
              style={[
                styles.reasonSummaryTitle,
                {
                  color:
                    colors.successText,
                },
              ]}
            >
              Supporting information
            </Text>
          </View>

          {why.map(
            (item, index) => (
              <View
                key={`why-${index}`}
                style={
                  styles.compactReasonRow
                }
              >
                <View
                  style={[
                    styles.smallDot,
                    {
                      backgroundColor:
                        colors.success,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.compactReasonText,
                    {
                      color:
                        colors.secondary,
                    },
                  ]}
                >
                  {humanizeText(
                    item
                  )}
                </Text>
              </View>
            )
          )}
        </View>
      )}


      {(missing.length > 0 ||
        missingSymptoms.length > 0) && (
        <View
          style={[
            styles.reasonSummaryBox,
            {
              backgroundColor:
                colors.cardAlt,

              borderColor:
                colors.border,
            },
          ]}
        >
          <View
            style={
              styles.reasonSummaryHeader
            }
          >
            <Ionicons
              name="help-circle-outline"
              size={18}
              color={colors.warning}
            />

            <Text
              style={[
                styles.reasonSummaryTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              Information still uncertain
            </Text>
          </View>

          {[
            ...missing,
            ...missingSymptoms,
          ]
            .filter(Boolean)
            .slice(0, 5)
            .map(
              (item, index) => (
                <View
                  key={`unknown-${index}`}
                  style={
                    styles.compactReasonRow
                  }
                >
                  <View
                    style={[
                      styles.smallDot,
                      {
                        backgroundColor:
                          colors.warning,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.compactReasonText,
                      {
                        color:
                          colors.secondary,
                      },
                    ]}
                  >
                    {humanizeText(
                      item
                    )}
                  </Text>
                </View>
              )
            )}
        </View>
      )}
    </View>
  );
}


/* ============================================================
   DETAILED REASONING
============================================================ */

function DetailedReasoning({
  differentials,
  missingSymptoms,
  colors,
}) {
  return (
    <View
      style={
        styles.detailedReasoning
      }
    >
      {differentials.map(
        (item, index) => {
          const why =
            asArray(item?.why);

          const missing =
            asArray(
              item?.missing_keys
            );

          return (
            <View
              key={`diff-${index}`}
              style={[
                styles.differentialBlock,
                {
                  backgroundColor:
                    colors.cardAlt,

                  borderColor:
                    colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.differentialTitle,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                {humanizeText(
                  item?.condition ||
                    `Possible condition ${
                      index + 1
                    }`
                )}
              </Text>

              {why.length > 0 && (
                <View
                  style={
                    styles.detailGroup
                  }
                >
                  <Text
                    style={[
                      styles.detailGroupLabel,
                      {
                        color:
                          colors.successText,
                      },
                    ]}
                  >
                    Supporting signals
                  </Text>

                  {why.slice(
                    0,
                    5
                  ).map(
                    (
                      entry,
                      itemIndex
                    ) => (
                      <InfoBullet
                        key={`support-${index}-${itemIndex}`}
                        colors={colors}
                        text={humanizeText(
                          entry
                        )}
                      />
                    )
                  )}
                </View>
              )}

              {missing.length > 0 && (
                <View
                  style={
                    styles.detailGroup
                  }
                >
                  <Text
                    style={[
                      styles.detailGroupLabel,
                      {
                        color:
                          colors.warningText,
                      },
                    ]}
                  >
                    Still uncertain
                  </Text>

                  {missing.slice(
                    0,
                    5
                  ).map(
                    (
                      entry,
                      itemIndex
                    ) => (
                      <InfoBullet
                        key={`missing-${index}-${itemIndex}`}
                        colors={colors}
                        text={humanizeText(
                          entry
                        )}
                        warning
                      />
                    )
                  )}
                </View>
              )}
            </View>
          );
        }
      )}

      {missingSymptoms.length >
        0 && (
        <View
          style={[
            styles.differentialBlock,
            {
              backgroundColor:
                colors.cardAlt,

              borderColor:
                colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.differentialTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            Additional information
          </Text>

          {missingSymptoms.map(
            (
              item,
              index
            ) => (
              <InfoBullet
                key={`extra-${index}`}
                colors={colors}
                text={humanizeText(
                  item
                )}
                warning
              />
            )
          )}
        </View>
      )}
    </View>
  );
}


/* ============================================================
   STEP ITEM
============================================================ */

function StepItem({
  number,
  text,
  colors,
}) {
  return (
    <View
      style={
        styles.stepRow
      }
    >
      <View
        style={[
          styles.stepNumber,
          {
            backgroundColor:
              colors.accentSoft,

            borderColor:
              colors.accentBorder,
          },
        ]}
      >
        <Text
          style={[
            styles.stepNumberText,
            {
              color:
                colors.accentText,
            },
          ]}
        >
          {number}
        </Text>
      </View>

      <Text
        style={[
          styles.stepText,
          {
            color:
              colors.secondary,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}


/* ============================================================
   FOLLOW-UP ROW
============================================================ */

function FollowUpRow({
  icon,
  title,
  text,
  colors,
  danger = false,
}) {
  return (
    <View
      style={[
        styles.followUpRow,
        {
          backgroundColor:
            danger
              ? colors.dangerSoft
              : colors.cardAlt,

          borderColor:
            danger
              ? colors.dangerBorder
              : colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.followUpIcon,
          {
            backgroundColor:
              danger
                ? colors.dangerBorder
                : colors.accentSoft,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={17}
          color={
            danger
              ? colors.dangerText
              : colors.accent
          }
        />
      </View>

      <View
        style={
          styles.followUpCopy
        }
      >
        <Text
          style={[
            styles.followUpTitle,
            {
              color:
                danger
                  ? colors.dangerText
                  : colors.text,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.followUpText,
            {
              color:
                colors.secondary,
            },
          ]}
        >
          {String(text)}
        </Text>
      </View>
    </View>
  );
}


/* ============================================================
   INFO BULLET
============================================================ */

function InfoBullet({
  text,
  colors,
  danger = false,
  warning = false,
}) {
  const bulletColor =
    danger
      ? colors.danger
      : warning
        ? colors.warning
        : colors.accent;

  return (
    <View
      style={
        styles.bulletRow
      }
    >
      <View
        style={[
          styles.bullet,
          {
            backgroundColor:
              bulletColor,
          },
        ]}
      />

      <Text
        style={[
          styles.bulletText,
          {
            color:
              colors.secondary,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}


/* ============================================================
   EMPTY INLINE
============================================================ */

function EmptyInlineMessage({
  colors,
  text,
}) {
  return (
    <View
      style={[
        styles.emptyInline,
        {
          backgroundColor:
            colors.cardAlt,

          borderColor:
            colors.border,
        },
      ]}
    >
      <Ionicons
        name="information-circle-outline"
        size={18}
        color={colors.muted}
      />

      <Text
        style={[
          styles.emptyInlineText,
          {
            color:
              colors.muted,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}


/* ============================================================
   SAFETY NOTICE
============================================================ */

function SafetyNotice({
  colors,
}) {
  return (
    <View
      style={[
        styles.safetyNotice,
        {
          backgroundColor:
            colors.card,

          borderColor:
            colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.safetyIcon,
          {
            backgroundColor:
              colors.accentSoft,
          },
        ]}
      >
        <Ionicons
          name="shield-checkmark-outline"
          size={18}
          color={colors.accent}
        />
      </View>

      <View
        style={
          styles.safetyCopy
        }
      >
        <Text
          style={[
            styles.safetyTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          CareSense AI safety note
        </Text>

        <Text
          style={[
            styles.safetyText,
            {
              color:
                colors.secondary,
            },
          ]}
        >
          This assessment is designed to support
          decision-making, not replace professional
          medical care. Get urgent help for emergencies
          or rapidly worsening symptoms.
        </Text>
      </View>
    </View>
  );
}


/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({
  /* ----------------------------------------------------------
     ROOT
  ---------------------------------------------------------- */

  root: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },


  /* ----------------------------------------------------------
     HEADER
  ---------------------------------------------------------- */

  header: {
    minHeight: 72,

    paddingHorizontal: 18,

    flexDirection: 'row',
    alignItems: 'center',

    borderBottomWidth: 1,
  },

  headerButton: {
    width: 44,
    height: 44,

    borderRadius: 14,

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 1,
  },

  headerCenter: {
    flex: 1,
    paddingHorizontal: 13,
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  headerSubtitle: {
    fontSize: 10.5,
    marginTop: 2,
    fontWeight: '600',
  },

  headerBrandIcon: {
    width: 44,
    height: 44,

    borderRadius: 14,

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 1,
  },


  /* ----------------------------------------------------------
     HERO
  ---------------------------------------------------------- */

  triageHero: {
    borderWidth: 1,
    borderRadius: 24,

    padding: 18,

    marginBottom: 16,
  },

  triageHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  triageIcon: {
    width: 58,
    height: 58,

    borderRadius: 19,

    alignItems: 'center',
    justifyContent: 'center',
  },

  triageHeroCopy: {
    flex: 1,
    marginLeft: 13,
  },

  triageBadge: {
    alignSelf: 'flex-start',

    borderRadius: 999,

    paddingHorizontal: 9,
    paddingVertical: 5,

    marginBottom: 7,
  },

  triageBadgeText: {
    color: '#FFFFFF',

    fontSize: 9,
    fontWeight: '900',

    letterSpacing: 0.9,
  },

  triageTitle: {
    fontSize: 22,
    lineHeight: 27,

    fontWeight: '850',

    letterSpacing: -0.3,
  },

  triageDescription: {
    fontSize: 13.5,
    lineHeight: 21,

    marginTop: 15,
  },

  emergencyActions: {
    marginTop: 15,
    gap: 9,
  },

  emergencyButton: {
    minHeight: 62,

    borderRadius: 17,

    paddingHorizontal: 14,

    flexDirection: 'row',
    alignItems: 'center',

    gap: 11,
  },

  emergencyButtonCopy: {
    flex: 1,
  },

  emergencyButtonTitle: {
    color: '#FFFFFF',

    fontSize: 14,
    fontWeight: '850',
  },

  emergencyButtonSubtitle: {
    color: 'rgba(255,255,255,0.78)',

    fontSize: 10.5,

    marginTop: 2,
  },

  understandButton: {
    minHeight: 53,

    borderRadius: 14,

    borderWidth: 1,

    paddingHorizontal: 12,

    flexDirection: 'row',
    alignItems: 'center',
  },

  checkbox: {
    width: 22,
    height: 22,

    borderRadius: 7,

    borderWidth: 2,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 9,
  },

  understandText: {
    flex: 1,

    fontSize: 11.5,
    lineHeight: 17,

    fontWeight: '650',
  },


  /* ----------------------------------------------------------
     INSUFFICIENT RESULT
  ---------------------------------------------------------- */

  insufficientHero: {
    borderWidth: 1,
    borderRadius: 25,

    padding: 21,

    marginBottom: 16,
  },

  heroCenter: {
    alignItems: 'center',
  },

  insufficientIcon: {
    width: 72,
    height: 72,

    borderRadius: 24,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 12,
  },

  heroBadge: {
    borderWidth: 1,

    borderRadius: 999,

    paddingHorizontal: 9,
    paddingVertical: 5,

    marginBottom: 11,
  },

  heroBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  insufficientTitle: {
    fontSize: 23,
    lineHeight: 29,

    fontWeight: '850',

    textAlign: 'center',
    letterSpacing: -0.35,
  },

  insufficientDescription: {
    fontSize: 13,
    lineHeight: 20,

    textAlign: 'center',

    marginTop: 9,
  },


  /* ----------------------------------------------------------
     PRIMARY ACTION
  ---------------------------------------------------------- */

  primaryAction: {
    minHeight: 56,

    borderRadius: 16,

    marginTop: 16,

    paddingHorizontal: 13,

    flexDirection: 'row',
    alignItems: 'center',

    gap: 10,

    elevation: 4,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.2,
    shadowRadius: 12,
  },

  primaryActionIcon: {
    width: 30,
    height: 30,

    borderRadius: 9,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      'rgba(0,0,0,0.08)',
  },

  primaryActionCopy: {
    flex: 1,
  },

  primaryActionTitle: {
    color: '#06110F',

    fontSize: 13,
    fontWeight: '850',
  },

  primaryActionSubtitle: {
    color:
      'rgba(6,17,15,0.66)',

    fontSize: 9.5,

    marginTop: 2,
  },

  primaryActionText: {
    color: '#06110F',

    fontSize: 14,
    fontWeight: '850',
  },

  secondaryAction: {
    minHeight: 56,

    borderWidth: 1,

    borderRadius: 16,

    marginTop: 9,

    paddingHorizontal: 13,

    flexDirection: 'row',
    alignItems: 'center',

    gap: 10,
  },

  secondaryActionIcon: {
    width: 32,
    height: 32,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryActionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },


  /* ----------------------------------------------------------
     SECTIONS
  ---------------------------------------------------------- */

  sectionCard: {
    borderWidth: 1,

    borderRadius: 21,

    padding: 16,

    marginBottom: 15,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',

    marginBottom: 14,
  },

  sectionIcon: {
    width: 38,
    height: 38,

    borderRadius: 12,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 10,
  },

  sectionHeaderCopy: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 16,
    lineHeight: 21,

    fontWeight: '850',
  },

  sectionSubtitle: {
    fontSize: 10.5,
    lineHeight: 16,

    marginTop: 3,
  },

  bodyText: {
    fontSize: 13.5,
    lineHeight: 21,
  },

  bodyTextSmall: {
    fontSize: 12,
    lineHeight: 19,
  },


  /* ----------------------------------------------------------
     INFO
  ---------------------------------------------------------- */

  infoBox: {
    borderWidth: 1,

    borderRadius: 14,

    padding: 11,

    marginTop: 13,

    flexDirection: 'row',
    alignItems: 'flex-start',

    gap: 9,
  },

  infoText: {
    flex: 1,

    fontSize: 10.5,
    lineHeight: 16,
  },

  emptyInline: {
    borderWidth: 1,

    borderRadius: 13,

    padding: 11,

    flexDirection: 'row',
    alignItems: 'flex-start',

    gap: 8,
  },

  emptyInlineText: {
    flex: 1,

    fontSize: 10.5,
    lineHeight: 16,
  },


  /* ----------------------------------------------------------
     CONDITIONS
  ---------------------------------------------------------- */

  conditionCard: {
    borderWidth: 1,

    borderRadius: 16,

    padding: 12,

    marginBottom: 9,
  },

  conditionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  conditionRank: {
    width: 31,
    height: 31,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 1,
  },

  conditionRankText: {
    fontSize: 12,
    fontWeight: '900',
  },

  conditionMain: {
    flex: 1,

    marginLeft: 9,
  },

  conditionNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',

    justifyContent:
      'space-between',

    gap: 8,
  },

  conditionName: {
    flex: 1,

    fontSize: 13.5,
    lineHeight: 18,

    fontWeight: '800',
  },

  confidenceBadge: {
    borderWidth: 1,

    borderRadius: 999,

    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  confidenceText: {
    fontSize: 10,

    fontWeight: '850',
  },

  conditionDescription: {
    fontSize: 10.5,
    lineHeight: 16,

    marginTop: 4,
  },

  confidenceTrack: {
    height: 6,

    borderRadius: 999,

    overflow: 'hidden',

    marginTop: 11,
  },

  confidenceFill: {
    height: '100%',

    borderRadius: 999,
  },


  /* ----------------------------------------------------------
     REASON
  ---------------------------------------------------------- */

  reasonSummaryBox: {
    borderWidth: 1,

    borderRadius: 15,

    padding: 12,

    marginBottom: 9,
  },

  reasonSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 7,

    marginBottom: 8,
  },

  reasonSummaryTitle: {
    fontSize: 11.5,
    fontWeight: '800',
  },

  compactReasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',

    marginTop: 5,
  },

  smallDot: {
    width: 6,
    height: 6,

    borderRadius: 3,

    marginTop: 6,
    marginRight: 8,
  },

  compactReasonText: {
    flex: 1,

    fontSize: 10.5,
    lineHeight: 16,
  },

  expandButton: {
    minHeight: 45,

    borderWidth: 1,

    borderRadius: 12,

    marginTop: 2,

    paddingHorizontal: 11,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  expandButtonText: {
    fontSize: 11,
    fontWeight: '750',
  },

  detailedReasoning: {
    marginTop: 10,
  },

  differentialBlock: {
    borderWidth: 1,

    borderRadius: 14,

    padding: 12,

    marginBottom: 9,
  },

  differentialTitle: {
    fontSize: 12.5,

    fontWeight: '850',

    marginBottom: 7,
  },

  detailGroup: {
    marginTop: 7,
  },

  detailGroupLabel: {
    fontSize: 10,

    fontWeight: '850',

    marginBottom: 4,
  },


  /* ----------------------------------------------------------
     STEPS
  ---------------------------------------------------------- */

  stepRow: {
    flexDirection: 'row',

    alignItems: 'flex-start',

    marginBottom: 12,
  },

  stepNumber: {
    width: 30,
    height: 30,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 1,

    marginRight: 10,
  },

  stepNumberText: {
    fontSize: 11,
    fontWeight: '900',
  },

  stepText: {
    flex: 1,

    fontSize: 12.5,
    lineHeight: 19,

    paddingTop: 4,
  },

  adviceBox: {
    borderWidth: 1,

    borderRadius: 14,

    padding: 12,

    marginTop: 3,
  },

  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 7,

    marginBottom: 6,
  },

  adviceLabel: {
    fontSize: 12,
    fontWeight: '800',
  },


  /* ----------------------------------------------------------
     FOLLOW-UP
  ---------------------------------------------------------- */

  followUpRow: {
    borderWidth: 1,

    borderRadius: 15,

    padding: 11,

    marginBottom: 8,

    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  followUpIcon: {
    width: 31,
    height: 31,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 9,
  },

  followUpCopy: {
    flex: 1,
  },

  followUpTitle: {
    fontSize: 11.5,
    fontWeight: '800',

    marginBottom: 3,
  },

  followUpText: {
    fontSize: 10.5,
    lineHeight: 16,
  },


  /* ----------------------------------------------------------
     EXTRA DETAILS
  ---------------------------------------------------------- */

  expandBar: {
    minHeight: 61,

    borderWidth: 1,

    borderRadius: 17,

    paddingHorizontal: 12,

    marginBottom: 10,

    flexDirection: 'row',
    alignItems: 'center',

    justifyContent:
      'space-between',
  },

  expandBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 10,
  },

  expandBarIcon: {
    width: 34,
    height: 34,

    borderRadius: 11,

    alignItems: 'center',
    justifyContent: 'center',
  },

  expandBarTitle: {
    fontSize: 12.5,
    fontWeight: '800',
  },

  expandBarSubtitle: {
    fontSize: 9.5,
    marginTop: 2,
  },

  medicineCard: {
    borderWidth: 1,

    borderRadius: 15,

    padding: 11,

    marginBottom: 8,

    flexDirection: 'row',
    alignItems: 'center',
  },

  medicineIcon: {
    width: 36,
    height: 36,

    borderRadius: 11,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 10,
  },

  medicineCopy: {
    flex: 1,
  },

  medicineName: {
    fontSize: 12.5,
    fontWeight: '800',
  },

  medicineDose: {
    fontSize: 10.5,
    lineHeight: 16,

    marginTop: 3,
  },

  medicationSafetyText: {
    fontSize: 9.5,
    lineHeight: 15,

    marginTop: 5,
  },


  /* ----------------------------------------------------------
     BULLETS
  ---------------------------------------------------------- */

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',

    marginBottom: 8,
  },

  bullet: {
    width: 6,
    height: 6,

    borderRadius: 3,

    marginTop: 6,
    marginRight: 8,
  },

  bulletText: {
    flex: 1,

    fontSize: 10.5,
    lineHeight: 16,
  },


  /* ----------------------------------------------------------
     SAFETY NOTICE
  ---------------------------------------------------------- */

  safetyNotice: {
    borderWidth: 1,

    borderRadius: 17,

    padding: 12,

    marginTop: 1,

    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  safetyIcon: {
    width: 34,
    height: 34,

    borderRadius: 11,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 9,
  },

  safetyCopy: {
    flex: 1,
  },

  safetyTitle: {
    fontSize: 11.5,
    fontWeight: '850',

    marginBottom: 3,
  },

  safetyText: {
    fontSize: 9.5,
    lineHeight: 15,
  },


  /* ----------------------------------------------------------
     REFERENCE
  ---------------------------------------------------------- */

  referenceCard: {
    minHeight: 38,

    borderWidth: 1,

    borderRadius: 12,

    paddingHorizontal: 10,

    flexDirection: 'row',
    alignItems: 'center',

    marginBottom: 10,
  },

  referenceText: {
    flex: 1,

    fontSize: 9,

    marginLeft: 7,
  },
});