import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  useColorScheme,
  StatusBar,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { openPDFReport } from '../services/api';

export default function HealthRecordDetail({ route, navigation }) {
  const { result } = route.params;

  const [saved, setSaved] = useState(false);
  const [understoodUrgency, setUnderstoodUrgency] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  const systemScheme = useColorScheme();
  const isDark = systemScheme === 'dark';

  /* -----------------------------------------------------------
     RESULT STATE
  ----------------------------------------------------------- */

  const isEmergency = result.triage_level === 'EMERGENCY';
  const isUrgent = result.triage_level === 'URGENT';
  const isRoutine = result.triage_level === 'ROUTINE';

  const isInsufficient = result.needs_clarification === true;

  const significantDiseases = (result.top_diseases || [])
    .filter((d) => Number(d.confidence || 0) >= 5)
    .slice(0, 3);

  const differentials = (result.differentials || []).slice(0, 2);
  const warnings = result.warnings || [];
  const uncertainty = result.uncertainty || {};
  const medicines = result.medicines || [];
  const interactions = result.drug_interactions || [];

  const auditId = result.audit_id || result.id || null;

  const hasExtraDetails =
    medicines.length > 0 ||
    interactions.length > 0 ||
    Boolean(result.fda_warning) ||
    warnings.length > 0;

  /* -----------------------------------------------------------
     COLORS
  ----------------------------------------------------------- */

  const colors = useMemo(
    () => ({
      background: isDark ? '#090909' : '#FFFFFF',
      card: isDark ? '#171717' : '#FFFFFF',
      cardAlt: isDark ? '#202020' : '#F8F8F8',

      text: isDark ? '#F5F5F5' : '#111111',
      secondary: isDark ? '#A3A3A3' : '#555555',
      muted: isDark ? '#737373' : '#777777',

      border: isDark ? '#333333' : '#E8E8E8',

      iconBg: isDark ? '#292929' : '#F5F5F5',

      danger: '#EF0011',
      dangerSoft: isDark ? '#351719' : '#FFE7E8',
      dangerText: isDark ? '#FF6B72' : '#D9000F',

      warning: '#F59E0B',
      warningSoft: isDark ? '#302512' : '#FFF5D8',

      success: '#00A878',
      successSoft: isDark ? '#10352B' : '#E3F8F1',

      primary: '#2563EB',
    }),
    [isDark]
  );

  /* -----------------------------------------------------------
     TRIAGE TEXT
  ----------------------------------------------------------- */

  const triageLabel = isEmergency
    ? 'EMERGENCY'
    : isUrgent
      ? 'URGENT'
      : 'ROUTINE';

  const triageTitle = isEmergency
    ? 'Get help right now'
    : isUrgent
      ? 'Get medical help soon'
      : 'You can monitor this';

  const triageDescription = isEmergency
    ? 'Your symptoms may be serious. Please do not wait at home. Go to an emergency department or call for emergency help immediately.'
    : isUrgent
      ? 'Your symptoms may need medical attention soon. Please contact a healthcare professional and do not ignore worsening symptoms.'
      : 'Your symptoms do not currently show an emergency pattern. Follow the advice below and watch for any changes.';

  /* -----------------------------------------------------------
     SAVE
  ----------------------------------------------------------- */

  const handleSave = () => {
    setSaved(true);

    Alert.alert(
      'Saved',
      'This assessment is already stored in your health records.'
    );
  };

  /* -----------------------------------------------------------
     PDF
  ----------------------------------------------------------- */

  const handleDownloadPDF = async () => {
    if (!auditId && !result.id) {
      Alert.alert(
        'Report unavailable',
        'This assessment does not have a record ID yet.'
      );
      return;
    }

    try {
      await openPDFReport(auditId || result.id);
    } catch (error) {
      Alert.alert(
        'Report unavailable',
        error?.message || 'Unable to download this report right now.'
      );
    }
  };

  /* -----------------------------------------------------------
     EMERGENCY CALL
  ----------------------------------------------------------- */

  const handleEmergencyCall = async () => {
    const url = 'tel:112';

    try {
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Emergency help',
          'Please call your local emergency number immediately.'
        );
      }
    } catch {
      Alert.alert(
        'Emergency help',
        'Please call your local emergency number immediately.'
      );
    }
  };

  /* -----------------------------------------------------------
     NEXT STEPS
  ----------------------------------------------------------- */

  const getNextSteps = () => {
    if (isEmergency) {
      return [
        'Call for emergency help or go to the emergency department now.',
        'Sit down, stay calm, and do not drive yourself.',
        'Keep someone nearby until help arrives.',
      ];
    }

    if (isUrgent) {
      return [
        'Contact a doctor or urgent-care service as soon as possible.',
        'Follow the advice below and avoid activities that make symptoms worse.',
        'Seek emergency help if severe symptoms suddenly appear.',
      ];
    }

    return [
      'Follow the care advice shown in this result.',
      'Rest, stay hydrated, and keep track of changes in your symptoms when appropriate.',
      'Contact a doctor if symptoms get worse, persist, or you become concerned.',
    ];
  };

  const nextSteps = getNextSteps();

  /* ===========================================================
     INSUFFICIENT INFORMATION
  =========================================================== */

  if (isInsufficient) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />

        <Header
          navigation={navigation}
          colors={colors}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.alertCard,
              {
                backgroundColor: isDark ? '#251B35' : '#F4EEFF',
                borderColor: isDark ? '#5B3A86' : '#D8C5FF',
              },
            ]}
          >
            <View style={styles.resultIconRow}>
              <View
                style={[
                  styles.resultIcon,
                  { backgroundColor: '#7C3AED' },
                ]}
              >
                <Ionicons
                  name="help"
                  size={30}
                  color="#FFFFFF"
                />
              </View>

              <View style={styles.heroText}>
                <Text
                  style={[
                    styles.eyebrow,
                    { color: '#7C3AED' },
                  ]}
                >
                  MORE INFORMATION NEEDED
                </Text>

                <Text
                  style={[
                    styles.heroTitle,
                    { color: colors.text },
                  ]}
                >
                  We need a little more information
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.heroDescription,
                { color: colors.secondary },
              ]}
            >
              Your symptoms are not specific enough for CareSense
              to give you a reliable result. Please add a few more
              details instead of guessing.
            </Text>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: '#7C3AED' },
              ]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Ionicons
                name="arrow-back"
                size={21}
                color="#FFFFFF"
              />

              <Text style={styles.primaryButtonText}>
                Add More Symptoms
              </Text>
            </TouchableOpacity>
          </View>

          <SectionCard
            colors={colors}
            icon="chatbubble-ellipses-outline"
            title="What this means"
          >
            <Text
              style={[
                styles.bodyText,
                { color: colors.secondary },
              ]}
            >
              {result.ai_summary ||
                'The information entered was too general to confidently narrow down the possible causes.'}
            </Text>
          </SectionCard>

          <SectionCard
            colors={colors}
            icon="information-circle-outline"
            title="How to get a better result"
          >
            <Bullet
              text="Tell us when the symptom started."
              colors={colors}
            />

            <Bullet
              text="Describe how severe it feels."
              colors={colors}
            />

            <Bullet
              text="Add other symptoms you are having."
              colors={colors}
            />

            <Bullet
              text="Mention anything that makes the symptom better or worse."
              colors={colors}
            />
          </SectionCard>
        </ScrollView>
      </View>
    );
  }

  /* ===========================================================
     NORMAL RESULT
  =========================================================== */

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background },
      ]}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <Header
        navigation={navigation}
        colors={colors}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* =====================================================
            1. MAIN RESULT
        ===================================================== */}

        <View
          style={[
            styles.alertCard,
            {
              backgroundColor: isEmergency
                ? colors.dangerSoft
                : isUrgent
                  ? colors.warningSoft
                  : colors.successSoft,

              borderColor: isEmergency
                ? '#FF9B9F'
                : isUrgent
                  ? '#F4C96B'
                  : '#7AD8BF',
            },
          ]}
        >
          <View style={styles.resultIconRow}>
            <View
              style={[
                styles.resultIcon,
                {
                  backgroundColor: isEmergency
                    ? colors.danger
                    : isUrgent
                      ? colors.warning
                      : colors.success,
                },
              ]}
            >
              <Ionicons
                name={
                  isEmergency
                    ? 'warning-outline'
                    : isUrgent
                      ? 'time-outline'
                      : 'checkmark'
                }
                size={31}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.heroText}>
              <Text
                style={[
                  styles.eyebrow,
                  {
                    color: isEmergency
                      ? colors.dangerText
                      : isUrgent
                        ? '#B36B00'
                        : '#008466',
                  },
                ]}
              >
                {triageLabel}
              </Text>

              <Text
                style={[
                  styles.heroTitle,
                  { color: colors.text },
                ]}
              >
                {triageTitle}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.heroDescription,
              { color: colors.secondary },
            ]}
          >
            {triageDescription}
          </Text>

          {isEmergency && (
            <>
              <TouchableOpacity
                style={[
                  styles.emergencyButton,
                  { backgroundColor: colors.danger },
                ]}
                onPress={handleEmergencyCall}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="call-outline"
                  size={22}
                  color="#FFFFFF"
                />

                <Text style={styles.emergencyButtonText}>
                  Call Emergency (112)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.understandButton,
                  {
                    backgroundColor: isDark
                      ? '#241011'
                      : '#FFF9F9',
                    borderColor: colors.border,
                  },
                ]}
                onPress={() =>
                  setUnderstoodUrgency(
                    (value) => !value
                  )
                }
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: understoodUrgency
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
                      size={17}
                      color="#FFFFFF"
                    />
                  )}
                </View>

                <Text
                  style={[
                    styles.understandText,
                    { color: colors.text },
                  ]}
                >
                  I understand this is an emergency
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* =====================================================
            2. WHAT WE FOUND
        ===================================================== */}

        {significantDiseases.length > 0 && (
          <SectionCard
            colors={colors}
            icon="medical-outline"
            title="What we found"
            subtitle={`${significantDiseases.length} possible condition${
              significantDiseases.length === 1
                ? ''
                : 's'
            }, most likely first`}
          >
            {significantDiseases.map(
              (disease, index) => (
                <ConditionItem
                  key={`${disease.condition}-${index}`}
                  disease={disease}
                  index={index}
                  colors={colors}
                  isDark={isDark}
                  primary={index === 0}
                />
              )
            )}
          </SectionCard>
        )}

        {/* =====================================================
            3. WHAT THIS MEANS
        ===================================================== */}

        <SectionCard
          colors={colors}
          icon="chatbubble-ellipses-outline"
          title="What this means"
        >
          <Text
            style={[
              styles.bodyText,
              { color: colors.secondary },
            ]}
          >
            {result.ai_summary ||
              result.explanation ||
              'The result is based on the symptoms you entered and the clinical rules used by CareSense.'}
          </Text>

          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: colors.cardAlt,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={colors.muted}
            />

            <Text
              style={[
                styles.infoText,
                { color: colors.muted },
              ]}
            >
              This app helps you understand your
              symptoms. It does not replace advice from
              a qualified doctor.
            </Text>
          </View>
        </SectionCard>

        {/* =====================================================
            4. WHY WE THINK SO
        ===================================================== */}

        {(differentials.length > 0 ||
          uncertainty.missing_symptoms?.length > 0) && (
          <SectionCard
            colors={colors}
            icon="clipboard-outline"
            title="Why we think so"
          >
            {differentials.length > 0 ? (
              <>
                {(
                  differentials[0]?.why || []
                )
                  .slice(0, 3)
                  .map((item, index) => (
                    <ReasonItem
                      key={`support-${index}`}
                      icon="checkmark-circle-outline"
                      title={formatSymptom(item)}
                      subtitle="You told us about this"
                      positive
                      colors={colors}
                    />
                  ))}

                {(
                  differentials[0]?.missing_keys || []
                )
                  .slice(0, 3)
                  .map((item, index) => (
                    <ReasonItem
                      key={`missing-${index}`}
                      icon="help-circle-outline"
                      title={formatSymptom(item)}
                      subtitle="We are not sure yet"
                      positive={false}
                      colors={colors}
                    />
                  ))}
              </>
            ) : (
              uncertainty.missing_symptoms
                ?.slice(0, 4)
                .map((item, index) => (
                  <ReasonItem
                    key={`uncertain-${index}`}
                    icon="help-circle-outline"
                    title={formatSymptom(item)}
                    subtitle="More information could improve confidence"
                    positive={false}
                    colors={colors}
                  />
                ))
            )}
          </SectionCard>
        )}

        {/* =====================================================
            5. WHAT TO DO NEXT
        ===================================================== */}

        <SectionCard
          colors={colors}
          icon="list-outline"
          title="What to do next"
        >
          {nextSteps.map((step, index) => (
            <StepItem
              key={index}
              number={index + 1}
              text={step}
              colors={colors}
            />
          ))}

          {result.advice ? (
            <View
              style={[
                styles.adviceBox,
                {
                  backgroundColor: colors.cardAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.adviceLabel,
                  { color: colors.text },
                ]}
              >
                Care advice
              </Text>

              <Text
                style={[
                  styles.bodyText,
                  { color: colors.secondary },
                ]}
              >
                {result.advice}
              </Text>
            </View>
          ) : null}
        </SectionCard>

        {/* =====================================================
            6. EXTRA DETAILS
        ===================================================== */}

        {hasExtraDetails && (
          <TouchableOpacity
            style={[
              styles.moreDetailsButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() =>
              setShowMoreDetails(
                (value) => !value
              )
            }
            activeOpacity={0.85}
          >
            <View style={styles.moreDetailsLeft}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={colors.text}
              />

              <Text
                style={[
                  styles.moreDetailsText,
                  { color: colors.text },
                ]}
              >
                {showMoreDetails
                  ? 'Hide extra details'
                  : 'Show extra details'}
              </Text>
            </View>

            <Ionicons
              name={
                showMoreDetails
                  ? 'chevron-up'
                  : 'chevron-down'
              }
              size={20}
              color={colors.muted}
            />
          </TouchableOpacity>
        )}

        {showMoreDetails && (
          <>
            {medicines.length > 0 &&
              isRoutine && (
                <SectionCard
                  colors={colors}
                  icon="medkit-outline"
                  title="Medicine information"
                >
                  <Text
                    style={[
                      styles.smallMuted,
                      { color: colors.muted },
                    ]}
                  >
                    Only medication information returned
                    by the clinical system is shown here.
                  </Text>

                  {medicines.map(
                    (med, index) => (
                      <View
                        key={`${med.name}-${index}`}
                        style={[
                          styles.medicineRow,
                          {
                            borderBottomColor:
                              colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.medicineName,
                            { color: colors.text },
                          ]}
                        >
                          {med.name}
                        </Text>

                        <Text
                          style={[
                            styles.medicineDose,
                            {
                              color:
                                colors.secondary,
                            },
                          ]}
                        >
                          {med.dosage}
                        </Text>
                      </View>
                    )
                  )}
                </SectionCard>
              )}

            {interactions.length > 0 && (
              <SectionCard
                colors={colors}
                icon="warning-outline"
                title="Medicine safety alerts"
              >
                {interactions.map(
                  (item, index) => (
                    <Text
                      key={index}
                      style={[
                        styles.bodyText,
                        {
                          color:
                            colors.secondary,
                        },
                      ]}
                    >
                      • {item}
                    </Text>
                  )
                )}
              </SectionCard>
            )}

            {result.fda_warning ? (
              <SectionCard
                colors={colors}
                icon="shield-checkmark-outline"
                title="Medicine warning"
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
                  {result.fda_warning}
                </Text>
              </SectionCard>
            ) : null}

            {warnings.length > 0 && (
              <SectionCard
                colors={colors}
                icon="alert-circle-outline"
                title="Safety alerts"
              >
                {warnings.map(
                  (warning, index) => (
                    <Text
                      key={index}
                      style={[
                        styles.bodyText,
                        {
                          color:
                            colors.secondary,
                        },
                      ]}
                    >
                      • {warning}
                    </Text>
                  )
                )}
              </SectionCard>
            )}
          </>
        )}

        {/* =====================================================
            7. FOLLOW UP
        ===================================================== */}

        {result.follow_up &&
          Object.keys(result.follow_up)
            .length > 0 && (
            <SectionCard
              colors={colors}
              icon="calendar-outline"
              title="Follow-up"
            >
              {result.follow_up
                .if_not_improved_24h ? (
                <Text
                  style={[
                    styles.bodyText,
                    {
                      color:
                        colors.secondary,
                      marginBottom: 8,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontWeight: '700',
                      color: colors.text,
                    }}
                  >
                    If not better:{' '}
                  </Text>

                  {
                    result.follow_up
                      .if_not_improved_24h
                  }
                </Text>
              ) : null}

              {result.follow_up.if_worsens ? (
                <Text
                  style={[
                    styles.bodyText,
                    {
                      color:
                        colors.secondary,
                      marginBottom: 8,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontWeight: '700',
                      color: colors.text,
                    }}
                  >
                    If worse:{' '}
                  </Text>

                  {result.follow_up.if_worsens}
                </Text>
              ) : null}

              {result.follow_up.red_flags ? (
                <Text
                  style={[
                    styles.bodyText,
                    {
                      color:
                        colors.dangerText,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontWeight: '700',
                    }}
                  >
                    Warning signs:{' '}
                  </Text>

                  {result.follow_up.red_flags}
                </Text>
              ) : null}
            </SectionCard>
          )}

        {/* =====================================================
            REFERENCE
        ===================================================== */}

        {auditId && (
          <Text
            style={[
              styles.reference,
              { color: colors.muted },
            ]}
          >
            Reference ID: {auditId}
          </Text>
        )}

        {/* =====================================================
            DOWNLOAD
        ===================================================== */}

        <TouchableOpacity
          style={[
            styles.bottomButton,
            {
              backgroundColor: isDark
                ? '#BDBDBD'
                : '#3F3F3F',
            },
          ]}
          onPress={handleDownloadPDF}
          activeOpacity={0.85}
        >
          <Ionicons
            name="document-text-outline"
            size={21}
            color={
              isDark
                ? '#303030'
                : '#FFFFFF'
            }
          />

          <Text
            style={[
              styles.bottomButtonText,
              {
                color: isDark
                  ? '#303030'
                  : '#FFFFFF',
              },
            ]}
          >
            Download Report
          </Text>
        </TouchableOpacity>

        {/* =====================================================
            SAVE
        ===================================================== */}

        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
          onPress={handleSave}
          disabled={saved}
          activeOpacity={0.85}
        >
          <Ionicons
            name={
              saved
                ? 'bookmark'
                : 'bookmark-outline'
            }
            size={22}
            color={
              saved
                ? colors.success
                : colors.text
            }
          />

          {saved && (
            <Text
              style={[
                styles.savedText,
                {
                  color:
                    colors.success,
                },
              ]}
            >
              Saved
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 22 }} />
      </ScrollView>
    </View>
  );
}

/* =============================================================
   HEADER
============================================================= */

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
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.headerButton,
          {
            backgroundColor:
              colors.iconBg,
          },
        ]}
        onPress={() =>
          navigation.goBack()
        }
        activeOpacity={0.8}
        accessibilityLabel="Go back"
      >
        <Ionicons
          name="arrow-back"
          size={23}
          color={colors.text}
        />
      </TouchableOpacity>

      <Text
        style={[
          styles.headerTitle,
          {
            color: colors.text,
          },
        ]}
      >
        Your Health Result
      </Text>

      <TouchableOpacity
        style={[
          styles.headerButton,
          {
            backgroundColor:
              colors.iconBg,
          },
        ]}
        onPress={() =>
          Alert.alert(
            'Share',
            'Sharing this result will be available soon.'
          )
        }
        activeOpacity={0.8}
        accessibilityLabel="Share result"
      >
        <Ionicons
          name="share-outline"
          size={21}
          color={colors.text}
        />
      </TouchableOpacity>
    </View>
  );
}

/* =============================================================
   SECTION CARD
============================================================= */

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
      <View style={styles.sectionHeader}>
        <Ionicons
          name={icon}
          size={22}
          color={colors.text}
        />

        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text,
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

/* =============================================================
   CONDITION
============================================================= */

function ConditionItem({
  disease,
  index,
  colors,
  isDark,
  primary,
}) {
  const confidence = Math.max(
    0,
    Math.min(
      100,
      Number(
        disease.confidence || 0
      )
    )
  );

  const name =
    disease.condition ||
    'Possible condition';

  return (
    <View
      style={[
        styles.conditionCard,
        {
          backgroundColor:
            isDark
              ? '#202020'
              : '#FAFAFA',
          borderColor:
            colors.border,
        },
      ]}
    >
      <View style={styles.conditionTop}>
        <View
          style={[
            styles.numberBadge,
            {
              backgroundColor:
                primary
                  ? isDark
                    ? '#5A1823'
                    : '#FFE0E2'
                  : isDark
                    ? '#292929'
                    : '#F0F0F0',
            },
          ]}
        >
          <Text
            style={[
              styles.numberBadgeText,
              {
                color: primary
                  ? colors.danger
                  : colors.muted,
              },
            ]}
          >
            {index + 1}
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            marginLeft: 10,
          }}
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
              {humanizeCondition(
                name
              )}
            </Text>

            <Text
              style={[
                styles.confidence,
                {
                  color: primary
                    ? colors.danger
                    : colors.muted,
                },
              ]}
            >
              {confidence.toFixed(
                confidence % 1 === 0
                  ? 0
                  : 1
              )}
              %
            </Text>
          </View>

          <Text
            style={[
              styles.conditionAlias,
              {
                color:
                  colors.muted,
              },
            ]}
          >
            {getConditionDescription(
              name
            )}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.progressTrack,
          {
            backgroundColor:
              isDark
                ? '#050505'
                : '#E4E4E4',
          },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${confidence}%`,
              backgroundColor:
                primary
                  ? colors.danger
                  : colors.muted,
            },
          ]}
        />
      </View>
    </View>
  );
}

/* =============================================================
   REASON
============================================================= */

function ReasonItem({
  icon,
  title,
  subtitle,
  positive,
  colors,
}) {
  return (
    <View
      style={[
        styles.reasonItem,
        {
          backgroundColor:
            positive
              ? colors.successSoft
              : colors.cardAlt,

          borderColor:
            positive
              ? '#8ADFC9'
              : colors.border,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={22}
        color={
          positive
            ? colors.success
            : colors.muted
        }
      />

      <View
        style={{
          flex: 1,
          marginLeft: 11,
        }}
      >
        <Text
          style={[
            styles.reasonTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          {formatSymptom(title)}
        </Text>

        <Text
          style={[
            styles.reasonSubtitle,
            {
              color:
                colors.muted,
            },
          ]}
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

/* =============================================================
   STEP
============================================================= */

function StepItem({
  number,
  text,
  colors,
}) {
  return (
    <View style={styles.stepRow}>
      <View
        style={[
          styles.stepNumber,
          {
            backgroundColor:
              colors.iconBg,
          },
        ]}
      >
        <Text
          style={[
            styles.stepNumberText,
            {
              color:
                colors.text,
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

/* =============================================================
   BULLET
============================================================= */

function Bullet({
  text,
  colors,
}) {
  return (
    <View
      style={styles.bulletRow}
    >
      <View
        style={[
          styles.bullet,
          {
            backgroundColor:
              '#7C3AED',
          },
        ]}
      />

      <Text
        style={[
          styles.bodyText,
          {
            color:
              colors.secondary,
            flex: 1,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

/* =============================================================
   HELPERS
============================================================= */

function humanizeCondition(
  value
) {
  if (!value) {
    return 'Possible condition';
  }

  return String(value)
    .replace(/_/g, ' ')
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );
}

function formatSymptom(
  value
) {
  if (!value) {
    return 'Symptom';
  }

  return String(value)
    .replace(/_/g, ' ')
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );
}

function getConditionDescription(
  condition
) {
  const normalized =
    String(condition || '')
      .toLowerCase();

  if (
    normalized.includes(
      'myocardial'
    ) ||
    normalized.includes(
      'heart attack'
    )
  ) {
    return 'Also called a Myocardial Infarction';
  }

  if (
    normalized.includes(
      'chikungunya'
    )
  ) {
    return 'A virus spread by mosquitoes';
  }

  if (
    normalized.includes(
      'dengue'
    )
  ) {
    return 'A mosquito-borne viral infection';
  }

  if (
    normalized.includes(
      'malaria'
    )
  ) {
    return 'A mosquito-borne infection';
  }

  if (
    normalized.includes(
      'influenza'
    ) ||
    normalized === 'flu'
  ) {
    return 'A common viral respiratory infection';
  }

  if (
    normalized.includes(
      'covid'
    )
  ) {
    return 'A respiratory infection caused by a coronavirus';
  }

  return 'A possible cause of your symptoms';
}

/* =============================================================
   STYLES
============================================================= */

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  header: {
    minHeight: 72,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  headerTitle: {
    flex: 1,
    fontSize: 23,
    fontWeight: '800',
    marginHorizontal: 14,
  },

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 42,
  },

  /* MAIN ALERT */

  alertCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 28,
    marginBottom: 28,
  },

  resultIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  resultIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  heroText: {
    flex: 1,
    marginLeft: 16,
  },

  eyebrow: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 3,
  },

  heroTitle: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
  },

  heroDescription: {
    fontSize: 17,
    lineHeight: 28,
    marginTop: 27,
  },

  emergencyButton: {
    minHeight: 69,
    borderRadius: 20,
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'center',
    gap: 10,
  },

  emergencyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  understandButton: {
    minHeight: 62,
    borderWidth: 1,
    borderRadius: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkbox: {
    width: 25,
    height: 25,
    borderWidth: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent:
      'center',
    marginRight: 11,
  },

  understandText: {
    fontSize: 17,
    fontWeight: '500',
  },

  primaryButton: {
    minHeight: 60,
    borderRadius: 18,
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'center',
    gap: 9,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  /* CARDS */

  sectionCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 28,
    marginBottom: 28,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 11,
  },

  sectionTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
  },

  sectionSubtitle: {
    fontSize: 15,
    lineHeight: 21,
    marginTop: 3,
  },

  bodyText: {
    fontSize: 17,
    lineHeight: 28,
  },

  infoBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },

  /* CONDITIONS */

  conditionCard: {
    borderWidth: 1,
    borderRadius: 19,
    padding: 16,
    marginBottom: 9,
  },

  conditionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  numberBadge: {
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  numberBadgeText: {
    fontSize: 14,
    fontWeight: '800',
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
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },

  confidence: {
    fontSize: 17,
    fontWeight: '800',
  },

  conditionAlias: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },

  progressTrack: {
    height: 12,
    borderRadius: 7,
    overflow: 'hidden',
    marginTop: 14,
  },

  progressFill: {
    height: '100%',
    borderRadius: 7,
  },

  /* WHY */

  reasonItem: {
    minHeight: 66,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  reasonTitle: {
    fontSize: 17,
    fontWeight: '600',
  },

  reasonSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },

  /* NEXT STEPS */

  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },

  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent:
      'center',
    marginRight: 14,
  },

  stepNumberText: {
    fontSize: 16,
    fontWeight: '800',
  },

  stepText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 26,
    paddingTop: 3,
  },

  adviceBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    marginTop: 5,
  },

  adviceLabel: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 5,
  },

  /* EXTRA DETAILS */

  moreDetailsButton: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 18,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  moreDetailsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  moreDetailsText: {
    fontSize: 16,
    fontWeight: '700',
  },

  medicineRow: {
    paddingVertical: 13,
    borderBottomWidth: 1,
  },

  medicineName: {
    fontSize: 17,
    fontWeight: '800',
  },

  medicineDose: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },

  smallMuted: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },

  /* BULLETS */

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 13,
  },

  bullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 10,
    marginRight: 11,
  },

  /* BOTTOM */

  reference: {
    textAlign: 'center',
    fontSize: 11,
    marginBottom: 12,
  },

  bottomButton: {
    minHeight: 64,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'center',
    gap: 10,
  },

  bottomButtonText: {
    fontSize: 18,
    fontWeight: '800',
  },

  saveButton: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 17,
    marginTop: 14,
    alignItems: 'center',
    justifyContent:
      'center',
    flexDirection: 'row',
    gap: 9,
  },

  savedText: {
    fontSize: 16,
    fontWeight: '700',
  },
});