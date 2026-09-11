import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Alert,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  getRecords,
  deleteRecord,
} from '../services/api';

import { AuthContext } from '../context/AuthContext';


/* ============================================================
   COLORS
============================================================ */

const COLORS = {
  blue: '#2166F3',

  emergency: '#EF1023',
  urgent: '#F59E0B',
  routine: '#10B981',
};


/* ============================================================
   TRIAGE CONFIG
============================================================ */

const TRIAGE_CONFIG = {
  EMERGENCY: {
    color: '#EF1023',
    lightBg: '#FFF0F1',
    darkBg: '#321416',
    icon: 'warning-outline',
    label: 'EMERGENCY',
  },

  URGENT: {
    color: '#F59E0B',
    lightBg: '#FFF7E8',
    darkBg: '#30240F',
    icon: 'time-outline',
    label: 'URGENT',
  },

  ROUTINE: {
    color: '#10B981',
    lightBg: '#EAFBF5',
    darkBg: '#0E3027',
    icon: 'checkmark-circle-outline',
    label: 'ROUTINE',
  },
};


const UNDO_TIMEOUT_MS = 4000;


/* ============================================================
   RECORD CARD
============================================================ */

function RecordCard({
  record,
  onPress,
  onDelete,
  theme,
  isDark,
  cardWidth,
}) {
  const triage =
    TRIAGE_CONFIG[
      String(
        record?.triage_level ||
        'URGENT'
      ).toUpperCase()
    ] ||
    TRIAGE_CONFIG.URGENT;


  /* ----------------------------------------------------------
     DATE
  ---------------------------------------------------------- */

  const dateObject =
    new Date(
      record?.created_at
    );


  const validDate =
    !Number.isNaN(
      dateObject.getTime()
    );


  const date = validDate
    ? dateObject.toLocaleDateString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }
      )
    : '';


  const time = validDate
    ? dateObject.toLocaleTimeString(
        'en-US',
        {
          hour: 'numeric',
          minute: '2-digit',
        }
      )
    : '';


  /* ----------------------------------------------------------
     SYMPTOMS
  ---------------------------------------------------------- */

  let symptomsText =
    'No symptoms recorded';


  if (
    typeof record?.symptoms ===
    'string'
  ) {
    symptomsText =
      record.symptoms;
  } else if (
    record?.symptoms?.text
  ) {
    symptomsText =
      record.symptoms.text;
  } else if (
    Array.isArray(
      record?.symptoms
    )
  ) {
    symptomsText =
      record.symptoms.join(', ');
  } else if (
    record?.symptoms_summary
  ) {
    symptomsText =
      record.symptoms_summary;
  }


  /* ----------------------------------------------------------
     SUMMARY
  ---------------------------------------------------------- */

  const summary =
    record?.ai_summary
      ?.split('.')[0]
      ?.trim() ||
    record?.ai_recommendation
      ?.split('.')[0]
      ?.trim() ||
    'Analysis complete';


  return (
    <TouchableOpacity
      style={[
        styles.card,

        {
          width: cardWidth,

          backgroundColor:
            theme.card,

          borderColor:
            theme.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >

      {/* ======================================================
          TOP ROW
      ====================================================== */}

      <View
        style={styles.cardTopRow}
      >

        {/* TRIAGE BADGE */}

        <View
          style={[
            styles.triageBadge,

            {
              borderColor:
                triage.color,

              backgroundColor:
                isDark
                  ? triage.darkBg
                  : triage.lightBg,
            },
          ]}
        >

          <Ionicons
            name={
              triage.icon
            }
            size={22}
            color={
              triage.color
            }
          />

          <Text
            style={[
              styles.triageText,
              {
                color:
                  triage.color,
              },
            ]}
            numberOfLines={1}
          >
            {triage.label}
          </Text>

        </View>


        {/* DELETE */}

        <TouchableOpacity
          style={[
            styles.deleteButton,

            {
              backgroundColor:
                isDark
                  ? '#321416'
                  : '#FFF0F1',

              borderColor:
                isDark
                  ? '#7F2930'
                  : '#FF9BA3',
            },
          ]}
          activeOpacity={0.75}
          hitSlop={{
            top: 10,
            bottom: 10,
            left: 10,
            right: 10,
          }}
          onPress={(event) => {
            /*
             * Prevent the card itself from opening
             * when the delete button is pressed.
             */
            event?.stopPropagation?.();

            onDelete();
          }}
        >

          <Ionicons
            name="trash-outline"
            size={25}
            color={
              triage.color
            }
          />

        </TouchableOpacity>

      </View>


      {/* ======================================================
          SYMPTOMS
      ====================================================== */}

      <Text
        style={[
          styles.symptomsText,
          {
            color:
              theme.primary,
          },
        ]}
        numberOfLines={3}
      >
        {symptomsText}
      </Text>


      {/* ======================================================
          DIVIDER
      ====================================================== */}

      <View
        style={[
          styles.divider,
          {
            backgroundColor:
              theme.border,
          },
        ]}
      />


      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <Text
        style={[
          styles.summaryText,
          {
            color:
              theme.secondary,
          },
        ]}
        numberOfLines={2}
      >
        {summary}
      </Text>


      {/* ======================================================
          DATE
      ====================================================== */}

      <View
        style={
          styles.dateRow
        }
      >

        <Ionicons
          name="calendar-outline"
          size={22}
          color={
            theme.secondary
          }
        />

        <Text
          style={[
            styles.dateText,
            {
              color:
                theme.secondary,
            },
          ]}
          numberOfLines={1}
        >
          {date}
          {date && time
            ? ' · '
            : ''}
          {time}
        </Text>

      </View>

    </TouchableOpacity>
  );
}


/* ============================================================
   UNDO TOAST
============================================================ */

function UndoToast({
  visible,
  onUndo,
  countdown,
  theme,
  isDark,
}) {
  const opacity =
    useRef(
      new Animated.Value(0)
    ).current;


  useEffect(() => {
    Animated.timing(
      opacity,
      {
        toValue:
          visible ? 1 : 0,

        duration: 200,

        useNativeDriver: true,
      }
    ).start();
  }, [
    visible,
    opacity,
  ]);


  if (!visible) {
    return null;
  }


  return (
    <Animated.View
      style={[
        styles.toast,

        {
          opacity,

          backgroundColor:
            theme.card,

          borderColor:
            theme.border,
        },
      ]}
    >

      <View
        style={
          styles.toastLeft
        }
      >

        <Ionicons
          name="trash-outline"
          size={21}
          color={
            COLORS.emergency
          }
        />

        <Text
          style={[
            styles.toastText,
            {
              color:
                theme.primary,
            },
          ]}
        >
          Record deleted
        </Text>

        <Text
          style={[
            styles.countdownText,
            {
              color:
                theme.secondary,
            },
          ]}
        >
          {countdown}s
        </Text>

      </View>


      <TouchableOpacity
        onPress={onUndo}
        style={
          styles.undoButton
        }
        activeOpacity={0.8}
      >

        <Text
          style={
            styles.undoText
          }
        >
          UNDO
        </Text>

      </TouchableOpacity>

    </Animated.View>
  );
}


/* ============================================================
   MAIN SCREEN
============================================================ */

export default function AllRecordsScreen({
  navigation,
}) {
  const {
    user,
  } = useContext(
    AuthContext
  );


  const isDark =
    useColorScheme() ===
    'dark';


  const {
    width,
  } =
    useWindowDimensions();


  /* ==========================================================
     RESPONSIVE SIZING
  ========================================================== */

  const horizontalPadding =
    width <= 360
      ? 22
      : width <= 390
        ? 24
        : 28;


  const cardWidth =
    width -
    horizontalPadding * 2;


  const isSmallPhone =
    width <= 370;


  /* ==========================================================
     THEME
  ========================================================== */

  const theme = {
    background:
      isDark
        ? '#080808'
        : '#FFFFFF',

    card:
      isDark
        ? '#171717'
        : '#FFFFFF',

    border:
      isDark
        ? '#303030'
        : '#E1E1E1',

    primary:
      isDark
        ? '#F7F7F7'
        : '#090909',

    secondary:
      isDark
        ? '#A0A0A0'
        : '#707070',

    muted:
      isDark
        ? '#777777'
        : '#777777',
  };


  /* ==========================================================
     STATE
  ========================================================== */

  const [
    records,
    setRecords,
  ] = useState([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState(null);


  const [
    pendingDelete,
    setPendingDelete,
  ] = useState(null);


  const [
    countdown,
    setCountdown,
  ] = useState(
    UNDO_TIMEOUT_MS / 1000
  );


  const countdownRef =
    useRef(null);


  /* ==========================================================
     FETCH RECORDS
  ========================================================== */

  const fetchRecords =
    useCallback(
      async () => {
        try {
          setError(null);

          const data =
            await getRecords(
              user?.uid ||
                'anonymous'
            );


          /*
           * Support both:
           *
           * [
           *   {...}
           * ]
           *
           * and:
           *
           * {
           *   records: [...]
           * }
           */

          let result = [];


          if (
            Array.isArray(data)
          ) {
            result = data;
          } else if (
            Array.isArray(
              data?.records
            )
          ) {
            result =
              data.records;
          } else if (
            Array.isArray(
              data?.data
            )
          ) {
            result =
              data.data;
          }


          /*
           * Newest first.
           */

          result =
            [...result].sort(
              (a, b) => {
                const aDate =
                  new Date(
                    a?.created_at ||
                      0
                  ).getTime();

                const bDate =
                  new Date(
                    b?.created_at ||
                      0
                  ).getTime();

                return (
                  bDate - aDate
                );
              }
            );


          setRecords(result);

        } catch (err) {
          console.log(
            'Get Records Error:',
            err
          );

          setError(
            'Unable to load your health records.'
          );

        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [user]
    );


  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    fetchRecords();
  }, [
    fetchRecords,
  ]);


  /* ==========================================================
     REFRESH ON FOCUS
  ========================================================== */

  useEffect(() => {
    const unsubscribe =
      navigation.addListener(
        'focus',
        fetchRecords
      );

    return unsubscribe;
  }, [
    navigation,
    fetchRecords,
  ]);


  /* ==========================================================
     COMMIT DELETE
  ========================================================== */

  const commitDelete =
    useCallback(
      async record => {
        try {
          await deleteRecord(
            record.id
          );

        } catch (err) {
          console.log(
            'Delete Record Error:',
            err
          );

          /*
           * Restore record if
           * server deletion failed.
           */

          setRecords(prev => {

            const exists =
              prev.some(
                item =>
                  item.id ===
                  record.id
              );

            if (exists) {
              return prev;
            }

            return [
              record,
              ...prev,
            ];
          });


          Alert.alert(
            'Unable to delete',
            'The record could not be deleted. Please try again.'
          );
        }
      },
      []
    );


  /* ==========================================================
     CLEAR UNDO
  ========================================================== */

  const clearUndoState =
    useCallback(() => {

      if (
        countdownRef.current
      ) {
        clearInterval(
          countdownRef.current
        );

        countdownRef.current =
          null;
      }

      setPendingDelete(
        null
      );

      setCountdown(
        UNDO_TIMEOUT_MS / 1000
      );

    }, []);


  /* ==========================================================
     DELETE HANDLER
  ========================================================== */

  const handleDelete =
    useCallback(
      record => {

        /*
         * If another record is waiting
         * to be permanently deleted,
         * commit that one first.
         */

        if (
          pendingDelete
        ) {
          clearUndoState();

          commitDelete(
            pendingDelete.record
          );
        }


        /*
         * Remove immediately
         * from the UI.
         */

        setRecords(
          previous =>
            previous.filter(
              item =>
                item.id !==
                record.id
            )
        );


        /*
         * Start undo countdown.
         */

        let seconds =
          UNDO_TIMEOUT_MS /
          1000;


        setCountdown(
          seconds
        );


        setPendingDelete({
          record,
        });


        countdownRef.current =
          setInterval(() => {

            seconds -= 1;

            setCountdown(
              seconds
            );


            if (
              seconds <= 0
            ) {
              clearInterval(
                countdownRef.current
              );

              countdownRef.current =
                null;


              setPendingDelete(
                previous => {

                  if (
                    previous
                  ) {
                    commitDelete(
                      previous.record
                    );
                  }

                  return null;
                }
              );
            }

          }, 1000);

      },
      [
        pendingDelete,
        clearUndoState,
        commitDelete,
      ]
    );


  /* ==========================================================
     UNDO
  ========================================================== */

  const handleUndo =
    useCallback(() => {

      if (
        !pendingDelete
      ) {
        return;
      }


      setRecords(
        previous => [
          pendingDelete.record,
          ...previous,
        ]
      );


      clearUndoState();

    }, [
      pendingDelete,
      clearUndoState,
    ]);


  /* ==========================================================
     CLEANUP
  ========================================================== */

  useEffect(() => {
    return () => {

      if (
        countdownRef.current
      ) {
        clearInterval(
          countdownRef.current
        );
      }

    };
  }, []);


  /* ==========================================================
     OPEN RECORD
  ========================================================== */

  const openRecord =
    record => {

      const medicines =
        record
          ?.medications?.[0]
          ?.medicines ||
        [];


      const explanation =
        record
          ?.medications?.[0]
          ?.explanation ||
        '';


      navigation.navigate(
        'HealthRecordDetail',
        {
          result: {
            ...record,

            medicines,

            explanation,

            needs_clarification:
              false,
          },
        }
      );
    };


  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
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

        <View
          style={
            styles.center
          }
        >

          <ActivityIndicator
            size="large"
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
            Loading your health records...
          </Text>

        </View>

      </SafeAreaView>
    );
  }


  /* ==========================================================
     ERROR
  ========================================================== */

  if (error) {
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

        <View
          style={
            styles.center
          }
        >

          <Ionicons
            name="cloud-offline-outline"
            size={52}
            color={
              COLORS.emergency
            }
          />


          <Text
            style={[
              styles.errorTitle,
              {
                color:
                  theme.primary,
              },
            ]}
          >
            Couldn't load records
          </Text>


          <Text
            style={[
              styles.errorText,
              {
                color:
                  theme.secondary,
              },
            ]}
          >
            {error}
          </Text>


          <TouchableOpacity
            style={
              styles.retryButton
            }
            onPress={
              fetchRecords
            }
            activeOpacity={0.8}
          >

            <Text
              style={
                styles.retryText
              }
            >
              Try Again
            </Text>

          </TouchableOpacity>

        </View>

      </SafeAreaView>
    );
  }


  /* ==========================================================
     EMPTY
  ========================================================== */

  if (
    records.length === 0 &&
    !pendingDelete
  ) {
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

        {/* HEADER */}

        <View
          style={[
            styles.topHeader,
            {
              paddingHorizontal:
                horizontalPadding,
            },
          ]}
        >

          <TouchableOpacity
            style={[
              styles.backButton,
              {
                backgroundColor:
                  theme.card,

                borderColor:
                  theme.border,
              },
            ]}
            onPress={() =>
              navigation.goBack()
            }
            activeOpacity={0.75}
          >

            <Ionicons
              name="arrow-back"
              size={28}
              color={
                theme.primary
              }
            />

          </TouchableOpacity>


          <Text
            style={[
              styles.topTitle,
              {
                color:
                  theme.primary,
              },
            ]}
          >
            My Records
          </Text>


          <View
            style={
              styles.headerSpacer
            }
          />

        </View>


        <View
          style={
            styles.center
          }
        >

          <View
            style={[
              styles.emptyIcon,
              {
                backgroundColor:
                  isDark
                    ? '#171717'
                    : '#F5F5F5',

                borderColor:
                  theme.border,
              },
            ]}
          >

            <Ionicons
              name="document-text-outline"
              size={46}
              color={
                theme.secondary
              }
            />

          </View>


          <Text
            style={[
              styles.emptyTitle,
              {
                color:
                  theme.primary,
              },
            ]}
          >
            No Health Records
          </Text>


          <Text
            style={[
              styles.emptySubtitle,
              {
                color:
                  theme.secondary,
              },
            ]}
          >
            Your saved symptom checks
            will appear here.
          </Text>


          <TouchableOpacity
            style={
              styles.checkButton
            }
            onPress={() =>
              navigation.navigate(
                'SymptomChecker'
              )
            }
            activeOpacity={0.8}
          >

            <Ionicons
              name="medical-outline"
              size={20}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.checkButtonText
              }
            >
              Check Symptoms
            </Text>

          </TouchableOpacity>

        </View>

      </SafeAreaView>
    );
  }


  /* ==========================================================
     MAIN SCREEN
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

      {/* ======================================================
          TOP HEADER
      ====================================================== */}

      <View
        style={[
          styles.topHeader,
          {
            paddingHorizontal:
              horizontalPadding,
          },
        ]}
      >

        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor:
                theme.card,

              borderColor:
                theme.border,
            },
          ]}
          onPress={() =>
            navigation.goBack()
          }
          activeOpacity={0.75}
        >

          <Ionicons
            name="arrow-back"
            size={28}
            color={
              theme.primary
            }
          />

        </TouchableOpacity>


        <Text
          style={[
            styles.topTitle,
            {
              color:
                theme.primary,
            },
          ]}
          numberOfLines={1}
        >
          My Records
        </Text>


        <View
          style={
            styles.headerSpacer
          }
        />

      </View>


      {/* ======================================================
          CONTENT
      ====================================================== */}

      <FlatList
        data={records}
        keyExtractor={item =>
          String(item.id)
        }

        contentContainerStyle={[
          styles.listContent,
          {
            paddingHorizontal:
              horizontalPadding,

            paddingBottom:
              pendingDelete
                ? 120
                : 40,
          },
        ]}


        ListHeaderComponent={
          <View
            style={
              styles.sectionHeader
            }
          >

            <Text
              style={[
                styles.sectionTitle,
                {
                  color:
                    theme.primary,

                  fontSize:
                    isSmallPhone
                      ? 27
                      : 30,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              My Health Records
            </Text>


            <Text
              style={[
                styles.recordCount,
                {
                  color:
                    theme.secondary,
                },
              ]}
            >
              {records.length}{' '}
              {records.length ===
              1
                ? 'record'
                : 'records'}
            </Text>

          </View>
        }


        renderItem={({
          item,
        }) => (

          <RecordCard
            record={item}
            theme={theme}
            isDark={isDark}
            cardWidth={cardWidth}

            onPress={() =>
              openRecord(item)
            }

            onDelete={() =>
              handleDelete(item)
            }
          />

        )}


        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }

            onRefresh={() => {
              setRefreshing(
                true
              );

              fetchRecords();
            }}

            tintColor={
              COLORS.blue
            }

            colors={[
              COLORS.blue,
            ]}
          />
        }


        showsVerticalScrollIndicator={
          false
        }
      />


      {/* ======================================================
          UNDO
      ====================================================== */}

      <UndoToast
        visible={
          !!pendingDelete
        }
        onUndo={
          handleUndo
        }
        countdown={
          countdown
        }
        theme={
          theme
        }
        isDark={
          isDark
        }
      />

    </SafeAreaView>
  );
}


/* ============================================================
   STYLES
============================================================ */

const styles =
  StyleSheet.create({

    /* ========================================================
       ROOT
    ======================================================== */

    safeArea: {
      flex: 1,
    },


    /* ========================================================
       TOP HEADER
    ======================================================== */

topHeader: {
  height: 78,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: 4,
  marginBottom: 6,
},

backButton: {
  width: 50,
  height: 50,
  borderRadius: 25,
  borderWidth: 1.5,
  justifyContent: 'center',
  alignItems: 'center',
  flexShrink: 0,
},

topTitle: {
  fontSize: 27,
  lineHeight: 33,
  fontWeight: '800',
  letterSpacing: -0.6,
  textAlign: 'center',
  flex: 1,
  marginHorizontal: 8,
},

headerSpacer: {
  width: 50,
  height: 50,
  flexShrink: 0,
},

listContent: {
  paddingTop: 10,
},

sectionHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 20,
  width: '100%',
},

sectionTitle: {
  fontSize: 30,
  lineHeight: 36,
  fontWeight: '800',
  letterSpacing: -0.8,
  flexShrink: 1,
},

recordCount: {
  fontSize: 18,
  lineHeight: 24,
  fontWeight: '400',
  marginLeft: 8,
  flexShrink: 0,
},

card: {
  minHeight: 265,
  borderRadius: 24,
  borderWidth: 1.5,
  paddingHorizontal: 28,
  paddingTop: 28,
  paddingBottom: 26,
  marginBottom: 16,
  position: 'relative',
},

cardTopRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 32,
  width: '100%',
},

triageBadge: {
  minHeight: 54,
  maxWidth: '70%',
  borderRadius: 28,
  borderWidth: 1.5,
  paddingHorizontal: 20,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
},

triageText: {
  fontSize: 17,
  lineHeight: 21,
  fontWeight: '700',
},

deleteButton: {
  width: 58,
  height: 58,
  borderRadius: 29,
  borderWidth: 1.5,
  justifyContent: 'center',
  alignItems: 'center',
  flexShrink: 0,
  marginLeft: 8,
},

symptomsText: {
  fontSize: 24,
  lineHeight: 33,
  fontWeight: '400',
  letterSpacing: -0.3,
  marginBottom: 28,
},

divider: {
  width: '100%',
  height: 1,
  marginBottom: 27,
},

summaryText: {
  fontSize: 19,
  lineHeight: 26,
  fontWeight: '400',
  marginBottom: 22,
},

dateRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 9,
},

dateText: {
  fontSize: 16,
  lineHeight: 22,
  fontWeight: '400',
  flexShrink: 1,
},


    /* ========================================================
       UNDO TOAST
    ======================================================== */

    toast: {
      position:
        'absolute',

      left: 22,

      right: 22,

      bottom: 24,

      minHeight: 66,

      borderRadius: 22,

      borderWidth: 2,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      paddingHorizontal: 18,

      paddingVertical: 10,

      elevation: 10,

      shadowColor: '#000',

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.2,

      shadowRadius: 10,
    },


    toastLeft: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 8,

      flexShrink: 1,
    },


    toastText: {
      fontSize: 15,

      fontWeight: '600',
    },


    countdownText: {
      fontSize: 14,

      fontWeight: '500',
    },


    undoButton: {
      backgroundColor:
        COLORS.blue,

      paddingHorizontal: 18,

      paddingVertical: 10,

      borderRadius: 17,

      marginLeft: 10,
    },


    undoText: {
      color: '#FFFFFF',

      fontSize: 13,

      fontWeight: '800',
    },


    /* ========================================================
       CENTER STATES
    ======================================================== */

    center: {
      flex: 1,

      justifyContent:
        'center',

      alignItems:
        'center',

      paddingHorizontal: 30,
    },


    loadingText: {
      marginTop: 15,

      fontSize: 16,

      textAlign: 'center',
    },


    errorTitle: {
      fontSize: 24,

      fontWeight: '800',

      marginTop: 18,

      textAlign: 'center',
    },


    errorText: {
      fontSize: 15,

      lineHeight: 22,

      textAlign: 'center',

      marginTop: 8,

      maxWidth: 330,
    },


    retryButton: {
      backgroundColor:
        COLORS.blue,

      paddingHorizontal: 28,

      paddingVertical: 13,

      borderRadius: 22,

      marginTop: 22,
    },


    retryText: {
      color: '#FFFFFF',

      fontSize: 15,

      fontWeight: '700',
    },


    /* ========================================================
       EMPTY
    ======================================================== */

    emptyIcon: {
      width: 90,

      height: 90,

      borderRadius: 45,

      borderWidth: 2,

      justifyContent:
        'center',

      alignItems:
        'center',
    },


    emptyTitle: {
      fontSize: 27,

      fontWeight: '800',

      marginTop: 20,
    },


    emptySubtitle: {
      fontSize: 16,

      lineHeight: 24,

      textAlign: 'center',

      marginTop: 8,

      maxWidth: 300,
    },


    checkButton: {
      backgroundColor:
        COLORS.blue,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 8,

      paddingHorizontal: 24,

      paddingVertical: 14,

      borderRadius: 24,

      marginTop: 24,
    },


    checkButtonText: {
      color: '#FFFFFF',

      fontSize: 16,

      fontWeight: '700',
    },

  });