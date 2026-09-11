import React, {
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AuthContext } from '../context/AuthContext';
import { getRecords } from '../services/api';


/* ============================================================
   COLORS
============================================================ */

const COLORS = {
  blue: '#2166F3',
  green: '#08B982',
  orange: '#FF7108',
  purple: '#7C27F5',

  emergency: '#EF1023',
  urgent: '#F59E0B',
  routine: '#10B981',
};


/* ============================================================
   TRIAGE CONFIG
============================================================ */

const TRIAGE_CONFIG = {
  EMERGENCY: {
    color: COLORS.emergency,
    icon: 'warning-outline',
    label: 'Emergency',
  },

  URGENT: {
    color: COLORS.urgent,
    icon: 'time-outline',
    label: 'Urgent',
  },

  ROUTINE: {
    color: COLORS.routine,
    icon: 'checkmark-circle-outline',
    label: 'Routine',
  },
};


/* ============================================================
   HOME SCREEN
============================================================ */

export default function HomeScreen({ navigation }) {
  const { user } = useContext(AuthContext);

  const isDark =
    useColorScheme() === 'dark';

  const { width } =
    useWindowDimensions();


  /* ==========================================================
     RESPONSIVE SIZING
  ========================================================== */

  /*
   * Keep enough horizontal space so the cards never
   * become too narrow.
   */

  const horizontalPadding =
    width <= 360
      ? 22
      : width <= 390
        ? 24
        : 28;

  const gridGap =
    width <= 360
      ? 12
      : 14;

  const cardWidth =
    (width -
      horizontalPadding * 2 -
      gridGap) / 2;

  const isSmallPhone =
    width <= 370;


  /*
   * Smaller icons than the previous version.
   * This prevents the colored circles from dominating
   * the cards.
   */

  const actionIconSize =
    isSmallPhone
      ? 104
      : 112;

  const actionIconRadius =
    actionIconSize / 2;


  /* ==========================================================
     THEME
  ========================================================== */

  const theme = {
    background: isDark
      ? '#080808'
      : '#FFFFFF',

    card: isDark
      ? '#171717'
      : '#FFFFFF',

    border: isDark
      ? '#303030'
      : '#E1E1E1',

    primary: isDark
      ? '#F7F7F7'
      : '#090909',

    secondary: isDark
      ? '#A0A0A0'
      : '#707070',

    avatarBackground:
      '#171717',

    avatarBorder:
      isDark
        ? '#303030'
        : '#171717',
  };


  /* ==========================================================
     STATE
  ========================================================== */

  const [
    recentRecords,
    setRecentRecords,
  ] = useState([]);

  const [
    loadingRecent,
    setLoadingRecent,
  ] = useState(true);


  /* ==========================================================
     FETCH RECENT RECORDS
  ========================================================== */

  const fetchRecent =
    useCallback(async () => {
      try {
        setLoadingRecent(true);

        /*
         * Your secured API should obtain ownership
         * from the Firebase token.
         *
         * The API helper may ignore this value depending
         * on your current implementation.
         */
        const data =
          await getRecords(
            user?.uid || 'anonymous'
          );

        let records = [];

        if (Array.isArray(data)) {
          records = data;
        } else if (
          Array.isArray(data?.records)
        ) {
          records = data.records;
        } else if (
          Array.isArray(data?.data)
        ) {
          records = data.data;
        }

        /*
         * Most recent first.
         */
        records = [...records]
          .sort((a, b) => {
            const aTime =
              new Date(
                a?.created_at ||
                a?.createdAt ||
                0
              ).getTime();

            const bTime =
              new Date(
                b?.created_at ||
                b?.createdAt ||
                0
              ).getTime();

            return bTime - aTime;
          })
          .slice(0, 3);

        setRecentRecords(records);

      } catch (error) {
        console.log(
          'Get Records Error:',
          error
        );

        setRecentRecords([]);

      } finally {
        setLoadingRecent(false);
      }
    }, [user]);


  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);


  /* ==========================================================
     REFRESH WHEN SCREEN GETS FOCUS
  ========================================================== */

  useEffect(() => {
    const unsubscribe =
      navigation.addListener(
        'focus',
        fetchRecent
      );

    return unsubscribe;
  }, [
    navigation,
    fetchRecent,
  ]);


  /* ==========================================================
     USER INFORMATION
  ========================================================== */

  const displayName =
    user?.displayName ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'there';

  const avatarLetter =
    (
      displayName
        ?.trim()
        ?.charAt(0) ||
      'U'
    ).toUpperCase();


  /* ==========================================================
     RECORD HELPERS
  ========================================================== */

  const getTriage = record => {
    const level =
      String(
        record?.triage_level ||
        record?.triageLevel ||
        record?.triage ||
        'URGENT'
      ).toUpperCase();

    return (
      TRIAGE_CONFIG[level] ||
      TRIAGE_CONFIG.URGENT
    );
  };


  const getCondition = record => {
    return (
      record?.top_diseases?.[0]?.condition ||
      record?.top_diseases?.[0]?.disease ||
      record?.topDiseases?.[0]?.condition ||
      record?.topDiseases?.[0]?.disease ||
      record?.condition ||
      record?.diagnosis ||
      record?.ai_risk_level ||
      'Analysis complete'
    );
  };


  const getSymptoms = record => {
    if (
      typeof record?.symptoms ===
      'string'
    ) {
      return record.symptoms;
    }

    if (
      Array.isArray(
        record?.symptoms
      )
    ) {
      return record.symptoms.join(', ');
    }

    if (
      record?.symptoms?.text
    ) {
      return record.symptoms.text;
    }

    if (
      record?.symptoms_summary
    ) {
      return record.symptoms_summary;
    }

    if (
      record?.symptom_summary
    ) {
      return record.symptom_summary;
    }

    if (
      record?.normalised_text
    ) {
      return record.normalised_text;
    }

    return 'Symptoms recorded';
  };


  const getDate = record => {
    const rawDate =
      record?.created_at ||
      record?.createdAt ||
      record?.date;

    if (!rawDate) {
      return '';
    }

    const date =
      new Date(rawDate);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '';
    }

    return date.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
      }
    );
  };


  /* ==========================================================
     OPEN RECORD
  ========================================================== */

  const openRecord = record => {
    navigation.navigate(
      'HealthRecordDetail',
      {
        result: record,
      }
    );
  };


  /* ==========================================================
     ACTION CARD
  ========================================================== */

  const ActionCard = ({
    color,
    icon,
    children,
    onPress,
  }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={onPress}
        style={[
          styles.actionCard,
          {
            width: cardWidth,

            height:
              isSmallPhone
                ? 238
                : 260,

            backgroundColor:
              theme.card,

            borderColor:
              theme.border,
          },
        ]}
      >

        {/* ICON */}

        <View
          style={[
            styles.actionIcon,
            {
              width:
                actionIconSize,

              height:
                actionIconSize,

              borderRadius:
                actionIconRadius,

              backgroundColor:
                color,
            },
          ]}
        >

          <Ionicons
            name={icon}
            size={
              isSmallPhone
                ? 44
                : 48
            }
            color="#FFFFFF"
          />

        </View>


        {/* LABEL */}

        <Text
          style={[
            styles.actionText,
            {
              color:
                theme.primary,

              fontSize:
                isSmallPhone
                  ? 20
                  : 22,

              lineHeight:
                isSmallPhone
                  ? 25
                  : 28,
            },
          ]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          {children}
        </Text>

      </TouchableOpacity>
    );
  };


  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.safeArea,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >

      <ScrollView
        style={[
          styles.container,
          {
            backgroundColor:
              theme.background,
          },
        ]}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal:
              horizontalPadding,

            /*
             * Space for the floating bottom
             * navigation bar.
             */
            paddingBottom: 145,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >


        {/* ==================================================
            HEADER
        ================================================== */}

        <View
          style={[
            styles.header,
            {
              marginBottom:
                isSmallPhone
                  ? 45
                  : 52,
            },
          ]}
        >

          <View
            style={styles.headerText}
          >

            <Text
              style={[
                styles.greeting,
                {
                  color:
                    theme.primary,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              Hello, {displayName} 👋
            </Text>


            <Text
              style={[
                styles.subGreeting,
                {
                  color:
                    theme.secondary,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              How are you feeling today?
            </Text>

          </View>


          <View
            style={[
              styles.avatarCircle,
              {
                width:
                  isSmallPhone
                    ? 94
                    : 104,

                height:
                  isSmallPhone
                    ? 94
                    : 104,

                borderRadius:
                  isSmallPhone
                    ? 47
                    : 52,

                backgroundColor:
                  theme.avatarBackground,

                borderColor:
                  theme.avatarBorder,
              },
            ]}
          >

            <Text
              style={[
                styles.avatarText,
                {
                  fontSize:
                    isSmallPhone
                      ? 38
                      : 44,
                },
              ]}
            >
              {avatarLetter}
            </Text>

          </View>

        </View>


        {/* ==================================================
            QUICK ACTIONS
        ================================================== */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                theme.primary,

              fontSize:
                isSmallPhone
                  ? 30
                  : 33,
            },
          ]}
        >
          Quick Actions
        </Text>


        <View
          style={[
            styles.actionGrid,
            {
              columnGap:
                gridGap,
            },
          ]}
        >

          <ActionCard
            color={
              COLORS.blue
            }
            icon="medical-outline"
            onPress={() =>
              navigation.navigate(
                'SymptomChecker'
              )
            }
          >
            Check{'\n'}Symptoms
          </ActionCard>


          <ActionCard
            color={
              COLORS.green
            }
            icon="medkit-outline"
            onPress={() =>
              navigation.navigate(
                'Doctors'
              )
            }
          >
            Find a{'\n'}Doctor
          </ActionCard>


          <ActionCard
            color={
              COLORS.orange
            }
            icon="document-text-outline"
            onPress={() =>
              navigation.navigate(
                'AllRecords'
              )
            }
          >
            My{'\n'}Records
          </ActionCard>


          <ActionCard
            color={
              COLORS.purple
            }
            icon="sparkles-outline"
            onPress={() =>
              navigation.navigate(
                'Medication'
              )
            }
          >
            Medications
          </ActionCard>

        </View>


        {/* ==================================================
            RECENT ACTIVITY HEADER
        ================================================== */}

        <View
          style={
            styles.recentHeader
          }
        >

          <Text
            style={[
              styles.sectionTitle,
              styles.recentTitle,
              {
                color:
                  theme.primary,

                fontSize:
                  isSmallPhone
                    ? 29
                    : 32,
              },
            ]}
          >
            Recent Activity
          </Text>


          {recentRecords.length >
            0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate(
                  'AllRecords'
                )
              }
            >

              <Text
                style={[
                  styles.seeAll,
                  {
                    color:
                      theme.primary,
                  },
                ]}
              >
                See all
              </Text>

            </TouchableOpacity>
          )}

        </View>


        {/* ==================================================
            LOADING
        ================================================== */}

        {loadingRecent && (
          <View
            style={[
              styles.loadingCard,
              {
                backgroundColor:
                  theme.card,

                borderColor:
                  theme.border,
              },
            ]}
          >

            <ActivityIndicator
              size="small"
              color={
                COLORS.blue
              }
            />

            <Text
              style={[
                styles.loadingText,
                {
                  color:
                    theme.secondary,
                },
              ]}
            >
              Loading recent activity...
            </Text>

          </View>
        )}


        {/* ==================================================
            EMPTY STATE
        ================================================== */}

        {!loadingRecent &&
          recentRecords.length ===
            0 && (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor:
                    theme.card,

                  borderColor:
                    theme.border,
                },
              ]}
            >

              <Ionicons
                name="pulse-outline"
                size={38}
                color={
                  theme.secondary
                }
              />

              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color:
                      theme.primary,
                  },
                ]}
              >
                No recent activity
              </Text>


              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      theme.secondary,
                  },
                ]}
              >
                Run your first symptom
                check to see your results
                here.
              </Text>


              <TouchableOpacity
                style={
                  styles.startButton
                }
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate(
                    'SymptomChecker'
                  )
                }
              >

                <Text
                  style={
                    styles.startButtonText
                  }
                >
                  Start Now
                </Text>

              </TouchableOpacity>

            </View>
          )}


        {/* ==================================================
            RECENT RECORDS
        ================================================== */}

        {!loadingRecent &&
          recentRecords.length >
            0 &&
          recentRecords.map(
            record => {

              const tri =
                getTriage(
                  record
                );

              const condition =
                getCondition(
                  record
                );

              const symptoms =
                getSymptoms(
                  record
                );

              const date =
                getDate(
                  record
                );

              return (
                <TouchableOpacity
                  key={
                    record.id ||
                    record.audit_id ||
                    String(
                      Math.random()
                    )
                  }
                  activeOpacity={0.82}
                  style={[
                    styles.recentCard,
                    {
                      backgroundColor:
                        theme.card,

                      borderColor:
                        theme.border,
                    },
                  ]}
                  onPress={() =>
                    openRecord(
                      record
                    )
                  }
                >

                  {/* ACCENT */}

                  <View
                    style={[
                      styles.cardAccent,
                      {
                        backgroundColor:
                          tri.color,
                      },
                    ]}
                  />


                  <View
                    style={
                      styles.cardContent
                    }
                  >

                    {/* TOP ROW */}

                    <View
                      style={
                        styles.cardTopRow
                      }
                    >

                      <View
                        style={[
                          styles.triagePill,
                          {
                            borderColor:
                              tri.color,

                            backgroundColor:
                              isDark
                                ? '#211414'
                                : '#FFFFFF',
                          },
                        ]}
                      >

                        <Ionicons
                          name={
                            tri.icon
                          }
                          size={16}
                          color={
                            tri.color
                          }
                        />


                        <Text
                          style={[
                            styles.triagePillText,
                            {
                              color:
                                tri.color,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {tri.label}
                        </Text>

                      </View>


                      <Text
                        style={[
                          styles.cardDate,
                          {
                            color:
                              theme.secondary,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {date}
                      </Text>

                    </View>


                    {/* CONDITION */}

                    <Text
                      style={[
                        styles.cardCondition,
                        {
                          color:
                            theme.primary,
                        },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.78}
                    >
                      {condition}
                    </Text>


                    {/* SYMPTOMS */}

                    <Text
                      style={[
                        styles.cardSymptoms,
                        {
                          color:
                            theme.secondary,
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {symptoms}
                    </Text>

                  </View>


                  {/* ARROW */}

                  <Ionicons
                    name="chevron-forward"
                    size={25}
                    color={
                      theme.secondary
                    }
                    style={
                      styles.cardArrow
                    }
                  />

                </TouchableOpacity>
              );
            }
          )}

      </ScrollView>

    </SafeAreaView>
  );
}


/* ============================================================
   STYLES
============================================================ */

const styles =
  StyleSheet.create({

    /* ========================================================
       SCREEN
    ======================================================== */

    safeArea: {
      flex: 1,
    },

    container: {
      flex: 1,
    },

    content: {
      paddingTop: 8,
    },


    /* ========================================================
       HEADER
    ======================================================== */

    header: {
      flexDirection: 'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',

      width: '100%',
    },

    headerText: {
      flex: 1,

      minWidth: 0,

      paddingTop: 5,

      paddingRight: 10,
    },

    greeting: {
      fontSize: 28,

      lineHeight: 34,

      fontWeight: '800',

      letterSpacing: -0.7,
    },

    subGreeting: {
      fontSize: 17,

      lineHeight: 22,

      fontWeight: '400',

      marginTop: 6,
    },

    avatarCircle: {
      justifyContent:
        'center',

      alignItems:
        'center',

      borderWidth: 2,

      flexShrink: 0,
    },

    avatarText: {
      color: '#FFFFFF',

      fontWeight: '700',
    },


    /* ========================================================
       SECTION TITLES
    ======================================================== */

    sectionTitle: {
      fontWeight: '800',

      letterSpacing: -0.8,

      marginBottom: 22,
    },


    /* ========================================================
       ACTION GRID
    ======================================================== */

    actionGrid: {
      flexDirection: 'row',

      flexWrap: 'wrap',

      justifyContent:
        'space-between',

      marginBottom: 58,
    },

    actionCard: {
      borderRadius: 26,

      borderWidth: 2,

      alignItems:
        'center',

      justifyContent:
        'flex-start',

      paddingTop: 26,

      marginBottom: 14,

      overflow: 'hidden',
    },

    actionIcon: {
      justifyContent:
        'center',

      alignItems:
        'center',

      marginBottom: 22,
    },

    actionText: {
      fontWeight: '700',

      textAlign: 'center',

      letterSpacing: -0.3,

      paddingHorizontal: 5,
    },


    /* ========================================================
       RECENT HEADER
    ======================================================== */

    recentHeader: {
      flexDirection: 'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginBottom: 22,

      width: '100%',
    },

    recentTitle: {
      marginBottom: 0,

      flexShrink: 1,
    },

    seeAll: {
      fontSize: 21,

      lineHeight: 27,

      fontWeight: '700',

      marginLeft: 10,
    },


    /* ========================================================
       LOADING
    ======================================================== */

    loadingCard: {
      minHeight: 120,

      borderRadius: 25,

      borderWidth: 2,

      flexDirection: 'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 10,
    },

    loadingText: {
      fontSize: 14,
    },


    /* ========================================================
       EMPTY
    ======================================================== */

    emptyCard: {
      minHeight: 220,

      borderRadius: 25,

      borderWidth: 2,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal: 24,
    },

    emptyTitle: {
      fontSize: 21,

      fontWeight: '700',

      marginTop: 11,
    },

    emptyText: {
      fontSize: 14,

      lineHeight: 21,

      textAlign: 'center',

      marginTop: 6,

      maxWidth: 280,
    },

    startButton: {
      backgroundColor:
        COLORS.blue,

      paddingHorizontal: 24,

      paddingVertical: 11,

      borderRadius: 22,

      marginTop: 17,
    },

    startButtonText: {
      color: '#FFFFFF',

      fontSize: 14,

      fontWeight: '700',
    },


    /* ========================================================
       RECENT RECORD CARD
    ======================================================== */

    recentCard: {
      width: '100%',

      minHeight: 205,

      borderRadius: 27,

      borderWidth: 2,

      flexDirection: 'row',

      alignItems:
        'stretch',

      overflow: 'hidden',

      marginBottom: 16,
    },

    cardAccent: {
      width: 7,

      marginLeft: 26,

      marginVertical: 25,

      borderRadius: 8,
    },

    cardContent: {
      flex: 1,

      minWidth: 0,

      paddingHorizontal: 18,

      paddingVertical: 25,
    },

    cardTopRow: {
      flexDirection: 'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginBottom: 18,

      minWidth: 0,
    },

    triagePill: {
      minHeight: 42,

      borderRadius: 21,

      borderWidth: 2,

      paddingHorizontal: 12,

      flexDirection: 'row',

      alignItems:
        'center',

      gap: 6,

      flexShrink: 1,

      maxWidth: '68%',
    },

    triagePillText: {
      fontSize: 16,

      fontWeight: '700',

      flexShrink: 1,
    },

    cardDate: {
      fontSize: 16,

      fontWeight: '500',

      marginLeft: 6,

      flexShrink: 0,
    },

    cardCondition: {
      fontSize: 24,

      lineHeight: 30,

      fontWeight: '800',

      letterSpacing: -0.4,

      marginBottom: 8,
    },

    cardSymptoms: {
      fontSize: 17,

      lineHeight: 24,

      fontWeight: '400',
    },

    cardArrow: {
      alignSelf:
        'center',

      marginRight: 15,

      flexShrink: 0,
    },

  });