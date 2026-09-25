import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { submitSymptoms } from '../services/api';
import { AuthContext } from '../context/AuthContext';


/* ============================================================
   CARESENSE SYMPTOM DATA
============================================================ */

const SYMPTOM_CATEGORIES = [
  {
    label: 'General',
    icon: 'body-outline',
    color: '#60A5FA',
    symptoms: [
      'Fever',
      'High Fever',
      'Fatigue',
      'Weakness',
      'Night Sweats',
      'Weight Loss',
      'Chills',
      'Loss of Appetite',
      'Sweating',
      'Pallor',
      'Malaise',
      'Lethargy',
    ],
  },
  {
    label: 'Head & Neuro',
    icon: 'pulse-outline',
    color: '#A78BFA',
    symptoms: [
      'Headache',
      'Migraine',
      'Dizziness',
      'Confusion',
      'Memory Loss',
      'Stiff Neck',
      'Fainting',
      'Blurred Vision',
      'Numbness',
      'Tingling',
      'Ear Pain',
      'Ringing in Ears',
      'Slurred Speech',
    ],
  },
  {
    label: 'Respiratory',
    icon: 'cloud-outline',
    color: '#34D399',
    symptoms: [
      'Cough',
      'Dry Cough',
      'Productive Cough',
      'Coughing Blood',
      'Sore Throat',
      'Shortness of Breath',
      'Wheezing',
      'Runny Nose',
      'Nasal Congestion',
      'Loss of Smell',
      'Loss of Taste',
      'Sneezing',
    ],
  },
  {
    label: 'Chest & Heart',
    icon: 'heart-outline',
    color: '#F87171',
    symptoms: [
      'Chest Pain',
      'Chest Tightness',
      'Chest Pressure',
      'Palpitations',
      'Rapid Heart Rate',
      'Shortness of Breath',
    ],
  },
  {
    label: 'Stomach & GI',
    icon: 'nutrition-outline',
    color: '#FBBF24',
    symptoms: [
      'Nausea',
      'Vomiting',
      'Vomiting Blood',
      'Diarrhea',
      'Constipation',
      'Abdominal Pain',
      'Bloating',
      'Heartburn',
      'Indigestion',
      'Blood in Stool',
      'Dark Urine',
      'Yellowing Skin',
    ],
  },
  {
    label: 'Skin',
    icon: 'contrast-outline',
    color: '#F472B6',
    symptoms: [
      'Rash',
      'Itching',
      'Hives',
      'Skin Redness',
      'Blisters',
      'Swelling',
      'Bruising',
      'Cold Sweats',
      'Flushed Skin',
    ],
  },
  {
    label: 'Muscles & Joints',
    icon: 'barbell-outline',
    color: '#FB923C',
    symptoms: [
      'Back Pain',
      'Joint Pain',
      'Muscle Pain',
      'Neck Pain',
      'Leg Pain',
      'Leg Swelling',
      'Muscle Weakness',
      'Stiffness',
      'Muscle Cramps',
    ],
  },
  {
    label: 'Urinary',
    icon: 'water-outline',
    color: '#38BDF8',
    symptoms: [
      'Frequent Urination',
      'Burning Urination',
      'Dark Urine',
      'Blood in Urine',
      'Excessive Thirst',
      'Pelvic Pain',
    ],
  },
];


/* ============================================================
   THEME
============================================================ */

const getTheme = (isDark) => ({
  background: isDark ? '#0A0F1A' : '#F7F9FC',
  surface: isDark ? '#111827' : '#FFFFFF',
  card: isDark ? '#141C29' : '#FFFFFF',
  cardElevated: isDark ? '#182231' : '#FFFFFF',

  input: isDark ? '#101722' : '#FFFFFF',

  border: isDark ? '#243044' : '#E2E8F0',
  borderSoft: isDark ? '#1B2636' : '#EEF2F7',

  textPrimary: isDark ? '#F8FAFC' : '#111827',
  textSecondary: isDark ? '#94A3B8' : '#64748B',
  textMuted: isDark ? '#64748B' : '#94A3B8',

  accent: '#00D4C5',
  accentDark: '#00B8AA',

  accentSoft: isDark ? '#0E282D' : '#E8FBF8',
  accentBorder: isDark ? '#1B4746' : '#B8EEE8',
  accentText: isDark ? '#8FF7ED' : '#007F77',

  selectedBg: isDark ? '#102A36' : '#EAFBF9',
  selectedBorder: '#00D4C5',
  selectedText: isDark ? '#9FF6EE' : '#007F77',

  progressTrack: isDark ? '#1A2433' : '#E5EAF1',

  dangerBg: isDark ? '#32171C' : '#FFF1F2',
  dangerBorder: isDark ? '#642A31' : '#FECDD3',
  dangerText: isDark ? '#FDA4AF' : '#BE123C',

  warningBg: isDark ? '#30240F' : '#FFFBEB',
  warningBorder: isDark ? '#604817' : '#FDE68A',
  warningText: isDark ? '#FCD34D' : '#B45309',

  buttonText: '#06110F',

  shadow: isDark ? '#000000' : '#64748B',
});


/* ============================================================
   SHARED SMALL COMPONENTS
============================================================ */

function ScreenHeader({
  theme,
  stepLabel,
  title,
  subtitle,
  icon = 'medkit-outline',
}) {
  return (
    <View style={styles.headerBlock}>
      <View style={styles.headerTopRow}>
        <View
          style={[
            styles.headerIconWrap,
            {
              backgroundColor: theme.accentSoft,
              borderColor: theme.accentBorder,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={18}
            color={theme.accent}
          />
        </View>

        <View
          style={[
            styles.stepPill,
            {
              backgroundColor: theme.accentSoft,
              borderColor: theme.accentBorder,
            },
          ]}
        >
          <View
            style={[
              styles.stepDot,
              { backgroundColor: theme.accent },
            ]}
          />

          <Text
            style={[
              styles.stepPillText,
              { color: theme.accentText },
            ]}
          >
            {stepLabel}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.screenTitle,
          { color: theme.textPrimary },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.screenSubtitle,
          { color: theme.textSecondary },
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
}


function SectionLabel({
  theme,
  icon,
  title,
  count,
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Ionicons
          name={icon}
          size={16}
          color={theme.accent}
        />

        <Text
          style={[
            styles.sectionTitle,
            { color: theme.textPrimary },
          ]}
        >
          {title}
        </Text>
      </View>

      {count !== undefined && (
        <Text
          style={[
            styles.sectionCount,
            { color: theme.textMuted },
          ]}
        >
          {count}
        </Text>
      )}
    </View>
  );
}


/* ============================================================
   STEP 1
============================================================ */

function StepEntry({
  symptoms,
  setSymptoms,
  onAnalyze,
  loading,
  theme,
}) {
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [activeCategory, setCategory] = useState(null);

  const selected = useMemo(
    () =>
      new Set(
        symptoms
          .split(',')
          .map(item => item.trim().toLowerCase())
          .filter(Boolean)
      ),
    [symptoms]
  );

  const toggleTag = useCallback(
    tag => {
      const tagLower = tag.toLowerCase();

      if (selected.has(tagLower)) {
        const updated = symptoms
          .split(',')
          .map(item => item.trim())
          .filter(
            item =>
              item &&
              item.toLowerCase() !== tagLower
          )
          .join(', ');

        setSymptoms(updated);
        return;
      }

      setSymptoms(prev =>
        prev.trim()
          ? `${prev.trim()}, ${tag}`
          : tag
      );
    },
    [selected, setSymptoms, symptoms]
  );

  const clearAll = () => {
    setSymptoms('');
  };

  const clearSearch = () => {
    setSearch('');
  };

  const searchLower = search.trim().toLowerCase();

  const visibleCategories = useMemo(() => {
    return SYMPTOM_CATEGORIES
      .filter(
        category =>
          !activeCategory ||
          category.label === activeCategory
      )
      .map(category => ({
        ...category,
        symptoms: category.symptoms.filter(
          item =>
            !searchLower ||
            item.toLowerCase().includes(searchLower)
        ),
      }))
      .filter(category => category.symptoms.length > 0);
  }, [activeCategory, searchLower]);

  return (
    <ScrollView
      style={[
        styles.scroll,
        { backgroundColor: theme.background },
      ]}
      contentContainerStyle={[
        styles.stepContainer,
        {
          paddingTop: 10,
          paddingBottom:
            insets.bottom +
            72,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        theme={theme}
        stepLabel="STEP 1 OF 2"
        icon="medical-outline"
        title="What are you experiencing?"
        subtitle="Select symptoms that match how you feel, then add any details that could help the assessment."
      />

      {/* Selected summary */}
      <View
        style={[
          styles.selectionSummary,
          {
            backgroundColor: selected.size
              ? theme.accentSoft
              : theme.card,
            borderColor: selected.size
              ? theme.accentBorder
              : theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.selectionIcon,
            {
              backgroundColor: selected.size
                ? theme.accent
                : theme.progressTrack,
            },
          ]}
        >
          <Ionicons
            name={
              selected.size
                ? 'checkmark'
                : 'checkmark-outline'
            }
            size={16}
            color={
              selected.size
                ? theme.buttonText
                : theme.textMuted
            }
          />
        </View>

        <View style={styles.selectionCopy}>
          <Text
            style={[
              styles.selectionTitle,
              { color: theme.textPrimary },
            ]}
          >
            {selected.size
              ? `${selected.size} symptom${
                  selected.size === 1 ? '' : 's'
                } selected`
              : 'No symptoms selected yet'}
          </Text>

          <Text
            style={[
              styles.selectionSubtitle,
              { color: theme.textSecondary },
            ]}
          >
            {selected.size
              ? 'You can add more symptoms below.'
              : 'Tap a symptom chip to add it.'}
          </Text>
        </View>

        {selected.size > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear all selected symptoms"
            onPress={clearAll}
            style={({ pressed }) => [
              styles.clearAction,
              {
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.clearActionText,
                { color: theme.accentText },
              ]}
            >
              Clear
            </Text>
          </Pressable>
        )}
      </View>

      {/* Search */}
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: theme.input,
            borderColor: theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.searchIcon,
            { backgroundColor: theme.progressTrack },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={16}
            color={theme.textSecondary}
          />
        </View>

        <TextInput
          style={[
            styles.searchInput,
            { color: theme.textPrimary },
          ]}
          placeholder="Search symptoms..."
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="done"
          accessibilityLabel="Search symptoms"
        />

        {search.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear symptom search"
            onPress={clearSearch}
            hitSlop={10}
          >
            <Ionicons
              name="close-circle"
              size={19}
              color={theme.textMuted}
            />
          </Pressable>
        )}
      </View>

      {/* Categories */}
      <View style={styles.categoryArea}>
        <SectionLabel
          theme={theme}
          icon="grid-outline"
          title="Symptom categories"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          <Pressable
            style={({ pressed }) => [
              styles.categoryChip,
              {
                backgroundColor:
                  !activeCategory
                    ? theme.accentSoft
                    : theme.card,
                borderColor:
                  !activeCategory
                    ? theme.accent
                    : theme.border,
                opacity: pressed ? 0.78 : 1,
              },
            ]}
            onPress={() => setCategory(null)}
          >
            <Ionicons
              name="apps-outline"
              size={14}
              color={
                !activeCategory
                  ? theme.accent
                  : theme.textMuted
              }
            />

            <Text
              style={[
                styles.categoryChipText,
                {
                  color:
                    !activeCategory
                      ? theme.accentText
                      : theme.textSecondary,
                  fontWeight: !activeCategory
                    ? '700'
                    : '500',
                },
              ]}
            >
              All
            </Text>
          </Pressable>

          {SYMPTOM_CATEGORIES.map(category => {
            const active =
              activeCategory === category.label;

            return (
              <Pressable
                key={category.label}
                style={({ pressed }) => [
                  styles.categoryChip,
                  {
                    backgroundColor: active
                      ? `${category.color}18`
                      : theme.card,
                    borderColor: active
                      ? category.color
                      : theme.border,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}
                onPress={() =>
                  setCategory(previous =>
                    previous === category.label
                      ? null
                      : category.label
                  )
                }
              >
                <Ionicons
                  name={category.icon}
                  size={14}
                  color={
                    active
                      ? category.color
                      : theme.textMuted
                  }
                />

                <Text
                  style={[
                    styles.categoryChipText,
                    {
                      color: active
                        ? category.color
                        : theme.textSecondary,
                      fontWeight: active
                        ? '700'
                        : '500',
                    },
                  ]}
                >
                  {category.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Symptoms */}
      {visibleCategories.length > 0 ? (
        visibleCategories.map(category => (
          <View
            key={category.label}
            style={styles.categorySection}
          >
            <View style={styles.categoryHeading}>
              <View
                style={[
                  styles.categoryAccent,
                  {
                    backgroundColor:
                      category.color,
                  },
                ]}
              />

              <View style={styles.categoryHeadingContent}>
                <View style={styles.categoryNameRow}>
                  <Ionicons
                    name={category.icon}
                    size={15}
                    color={category.color}
                  />

                  <Text
                    style={[
                      styles.categoryName,
                      {
                        color: theme.textPrimary,
                      },
                    ]}
                  >
                    {category.label}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.categoryCount,
                    { color: theme.textMuted },
                  ]}
                >
                  {category.symptoms.length} options
                </Text>
              </View>
            </View>

            <View style={styles.tagsWrap}>
              {category.symptoms.map(tag => {
                const isSelected = selected.has(
                  tag.toLowerCase()
                );

                return (
                  <Pressable
                    key={tag}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: isSelected,
                    }}
                    style={({ pressed }) => [
                      styles.tag,
                      {
                        backgroundColor: isSelected
                          ? theme.selectedBg
                          : theme.card,
                        borderColor: isSelected
                          ? theme.selectedBorder
                          : theme.border,
                        transform: [
                          {
                            scale: pressed
                              ? 0.97
                              : 1,
                          },
                        ],
                      },
                    ]}
                    onPress={() => toggleTag(tag)}
                  >
                    {isSelected ? (
                      <View
                        style={[
                          styles.tagCheck,
                          {
                            backgroundColor:
                              theme.accent,
                          },
                        ]}
                      >
                        <Ionicons
                          name="checkmark"
                          size={10}
                          color={theme.buttonText}
                        />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.tagPlus,
                          {
                            borderColor:
                              theme.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name="add"
                          size={10}
                          color={theme.textMuted}
                        />
                      </View>
                    )}

                    <Text
                      style={[
                        styles.tagText,
                        {
                          color: isSelected
                            ? theme.selectedText
                            : theme.textSecondary,
                        },
                      ]}
                    >
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))
      ) : (
        <View
          style={[
            styles.emptySearchCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.emptySearchIcon,
              {
                backgroundColor:
                  theme.progressTrack,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={22}
              color={theme.textMuted}
            />
          </View>

          <Text
            style={[
              styles.emptySearchTitle,
              { color: theme.textPrimary },
            ]}
          >
            No matching symptoms
          </Text>

          <Text
            style={[
              styles.emptySearchText,
              { color: theme.textSecondary },
            ]}
          >
            Try another search term or switch to a
            different category.
          </Text>
        </View>
      )}

      {/* Detailed description */}
      <View style={styles.detailsSection}>
        <SectionLabel
          theme={theme}
          icon="create-outline"
          title="Add more details"
        />

        <Text
          style={[
            styles.detailsHint,
            { color: theme.textSecondary },
          ]}
        >
          Mention duration, severity, location, triggers,
          or anything else you think is relevant.
        </Text>

        <View
          style={[
            styles.textInputCard,
            {
              backgroundColor: theme.input,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.textInputTop}>
            <View
              style={[
                styles.textInputIcon,
                { backgroundColor: theme.accentSoft },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={16}
                color={theme.accent}
              />
            </View>

            <Text
              style={[
                styles.textInputTopText,
                { color: theme.textMuted },
              ]}
            >
              Your description
            </Text>
          </View>

          <TextInput
            style={[
              styles.textInput,
              { color: theme.textPrimary },
            ]}
            multiline
            textAlignVertical="top"
            placeholder={
              'Example:\n“Throbbing headache on the right side for 2 days with mild nausea.”'
            }
            placeholderTextColor={theme.textMuted}
            value={symptoms}
            onChangeText={setSymptoms}
            accessibilityLabel="Describe your symptoms"
          />

          <View style={styles.textInputBottom}>
            <View style={styles.characterHint}>
              <Ionicons
                name="information-circle-outline"
                size={13}
                color={theme.textMuted}
              />

              <Text
                style={[
                  styles.characterHintText,
                  { color: theme.textMuted },
                ]}
              >
                Include as much relevant detail as you
                can.
              </Text>
            </View>

            <Text
              style={[
                styles.characterCount,
                { color: theme.textMuted },
              ]}
            >
              {symptoms.length}
            </Text>
          </View>
        </View>
      </View>

      {/* Analyze */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Analyse symptoms"
        accessibilityState={{
          disabled:
            !symptoms.trim() || loading,
          busy: loading,
        }}
        disabled={!symptoms.trim() || loading}
        onPress={onAnalyze}
        style={({ pressed }) => [
          styles.primaryButton,
          {
            backgroundColor: theme.accent,
            opacity:
              !symptoms.trim() || loading
                ? 0.45
                : pressed
                  ? 0.82
                  : 1,
            shadowColor: theme.accent,
          },
        ]}
      >
        {loading ? (
          <>
            <ActivityIndicator
              size="small"
              color={theme.buttonText}
            />

            <Text
              style={[
                styles.primaryButtonText,
                {
                  color: theme.buttonText,
                },
              ]}
            >
              Analysing...
            </Text>
          </>
        ) : (
          <>
            <View style={styles.primaryButtonIcon}>
              <Ionicons
                name="sparkles"
                size={18}
                color={theme.buttonText}
              />
            </View>

            <Text
              style={[
                styles.primaryButtonText,
                {
                  color: theme.buttonText,
                },
              ]}
            >
              Analyse Symptoms
            </Text>

            <Ionicons
              name="arrow-forward"
              size={18}
              color={theme.buttonText}
            />
          </>
        )}
      </Pressable>

      {/* Trust / safety */}
      <View
        style={[
          styles.disclaimerCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        <Ionicons
          name="shield-checkmark-outline"
          size={17}
          color={theme.accent}
        />

        <Text
          style={[
            styles.disclaimerText,
            { color: theme.textSecondary },
          ]}
        >
          CareSense AI is a decision-support tool, not a
          diagnosis. Seek urgent professional help for
          emergencies.
        </Text>
      </View>
    </ScrollView>
  );
}


/* ============================================================
   STEP 2
============================================================ */

function StepClarify({
  data,
  onSubmit,
  onBack,
  loading,
  theme,
}) {
  const insets = useSafeAreaInsets();

  const question = data?.question || null;
  const progress = data?.progress || {};
  const knownStates = data?.known_states || {};

  const [selectedAnswer, setSelectedAnswer] =
    useState(null);

  /*
   * IMPORTANT BUG FIX:
   *
   * The previous component relied on the parent updating
   * clarification data and assumed the child would reset.
   * React keeps this component mounted, so local state did
   * not automatically reset when the question changed.
   *
   * Reset whenever the backend returns a new question.
   */
  useEffect(() => {
    setSelectedAnswer(null);
  }, [question?.id]);

  const options = useMemo(
    () =>
      Array.isArray(question?.options) &&
      question.options.length > 0
        ? question.options
        : ['Yes', 'No', 'Not sure', 'Skip'],
    [question?.options]
  );

  const handleContinue = () => {
    if (
      !question ||
      !selectedAnswer ||
      loading
    ) {
      return;
    }

    onSubmit({
      [question.id]: selectedAnswer,
    });
  };

  if (!question) {
    return (
      <ScrollView
        style={[
          styles.scroll,
          { backgroundColor: theme.background },
        ]}
        contentContainerStyle={[
          styles.stepContainer,
          {
            paddingTop: 10,
            paddingBottom:
              insets.bottom +
              72,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          theme={theme}
          stepLabel="STEP 2 OF 2"
          icon="checkmark-circle-outline"
          title="Analysis ready"
          subtitle="The assessment has enough information to continue."
        />

        <View
          style={[
            styles.completionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.completionIcon,
              {
                backgroundColor:
                  theme.accentSoft,
              },
            ]}
          >
            <Ionicons
              name="checkmark"
              size={28}
              color={theme.accent}
            />
          </View>

          <Text
            style={[
              styles.completionTitle,
              { color: theme.textPrimary },
            ]}
          >
            All set
          </Text>

          <Text
            style={[
              styles.completionText,
              { color: theme.textSecondary },
            ]}
          >
            We have enough information to continue
            with your assessment.
          </Text>
        </View>

        <View
          style={[
            styles.disclaimerCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={17}
            color={theme.accent}
          />

          <Text
            style={[
              styles.disclaimerText,
              { color: theme.textSecondary },
            ]}
          >
            CareSense AI is a decision-support tool and
            does not provide a diagnosis.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const answered = Number(progress.answered) || 0;

  const maximum =
    Number(progress.maximum_recommended) || 5;

  const safeMaximum = Math.max(maximum, 1);

  const percentage = Math.min(
    Math.max(
      (answered / safeMaximum) * 100,
      0
    ),
    100
  );

  const displayQuestionNumber = Math.min(
    answered + 1,
    safeMaximum
  );

  const absent =
    Array.isArray(knownStates.absent)
      ? knownStates.absent
      : [];

  const unknown =
    Array.isArray(knownStates.unknown)
      ? knownStates.unknown
      : [];

  const skipped =
    Array.isArray(knownStates.skipped)
      ? knownStates.skipped
      : [];

  return (
    <ScrollView
      style={[
        styles.scroll,
        { backgroundColor: theme.background },
      ]}
      contentContainerStyle={[
        styles.stepContainer,
        {
          paddingTop: 10,
          paddingBottom:
            insets.bottom +
            72,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back and edit symptoms"
        disabled={loading}
        onPress={onBack}
        style={({ pressed }) => [
          styles.backButton,
          {
            borderColor: theme.border,
            backgroundColor: theme.card,
            opacity: loading
              ? 0.45
              : pressed
                ? 0.7
                : 1,
          },
        ]}
      >
        <Ionicons
          name="arrow-back"
          size={17}
          color={theme.textSecondary}
        />

        <Text
          style={[
            styles.backButtonText,
            {
              color: theme.textPrimary,
            },
          ]}
        >
          Back to Symptoms
        </Text>
      </Pressable>

      <ScreenHeader
        theme={theme}
        stepLabel={`QUESTION ${displayQuestionNumber} OF ${safeMaximum}`}
        icon="chatbubble-ellipses-outline"
        title="One quick follow-up"
        subtitle="This question is selected from the symptoms and answers you've already provided."
      />

      {/* Progress */}
      <View
        style={[
          styles.progressCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.progressHeader}>
          <View style={styles.progressTitleRow}>
            <Ionicons
              name="analytics-outline"
              size={15}
              color={theme.accent}
            />

            <Text
              style={[
                styles.progressLabel,
                { color: theme.textSecondary },
              ]}
            >
              Assessment progress
            </Text>
          </View>

          <Text
            style={[
              styles.progressValue,
              { color: theme.accentText },
            ]}
          >
            {answered}/{safeMaximum}
          </Text>
        </View>

        <View
          style={[
            styles.progressTrack,
            {
              backgroundColor:
                theme.progressTrack,
            },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${percentage}%`,
                backgroundColor: theme.accent,
              },
            ]}
          />
        </View>

        <Text
          style={[
            styles.progressHint,
            { color: theme.textMuted },
          ]}
        >
          {percentage >= 100
            ? 'Recommended follow-up complete'
            : 'A few focused questions can improve context'}
        </Text>
      </View>

      {/* Danger / urgent question */}
      {question.danger && (
        <View
          style={[
            styles.redFlagCard,
            {
              backgroundColor: theme.dangerBg,
              borderColor: theme.dangerBorder,
            },
          ]}
        >
          <View
            style={[
              styles.redFlagIcon,
              {
                backgroundColor:
                  theme.dangerBorder,
              },
            ]}
          >
            <Ionicons
              name="warning"
              size={16}
              color={theme.dangerText}
            />
          </View>

          <View style={styles.redFlagContent}>
            <Text
              style={[
                styles.redFlagTitle,
                { color: theme.dangerText },
              ]}
            >
              Important question
            </Text>

            <Text
              style={[
                styles.redFlagText,
                { color: theme.dangerText },
              ]}
            >
              This checks for symptoms that may require
              urgent medical attention. Answer as
              accurately as you can.
            </Text>
          </View>
        </View>
      )}

      {/* Question */}
      <View
        style={[
          styles.questionCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.questionCardTop}>
          <View
            style={[
              styles.questionBadge,
              {
                backgroundColor:
                  theme.accentSoft,
                borderColor:
                  theme.accentBorder,
              },
            ]}
          >
            <Ionicons
              name="help-circle-outline"
              size={14}
              color={theme.accent}
            />

            <Text
              style={[
                styles.questionBadgeText,
                { color: theme.accentText },
              ]}
            >
              QUESTION
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.questionText,
            { color: theme.textPrimary },
          ]}
        >
          {question.text}
        </Text>

        <View style={styles.optionsWrap}>
          {options.map(option => {
            const selected =
              selectedAnswer === option;

            return (
              <Pressable
                key={String(option)}
                accessibilityRole="radio"
                accessibilityState={{
                  selected,
                  disabled: loading,
                }}
                disabled={loading}
                style={({ pressed }) => [
                  styles.optionButton,
                  {
                    backgroundColor: selected
                      ? theme.selectedBg
                      : theme.surface,
                    borderColor: selected
                      ? theme.selectedBorder
                      : theme.border,
                    opacity: pressed
                      ? 0.8
                      : 1,
                  },
                ]}
                onPress={() =>
                  setSelectedAnswer(option)
                }
              >
                <View
                  style={[
                    styles.optionRadio,
                    {
                      borderColor: selected
                        ? theme.accent
                        : theme.border,
                      backgroundColor:
                        selected
                          ? theme.accentSoft
                          : 'transparent',
                    },
                  ]}
                >
                  {selected && (
                    <View
                      style={[
                        styles.optionRadioDot,
                        {
                          backgroundColor:
                            theme.accent,
                        },
                      ]}
                    />
                  )}
                </View>

                <Text
                  style={[
                    styles.optionText,
                    {
                      color: selected
                        ? theme.selectedText
                        : theme.textPrimary,
                    },
                  ]}
                >
                  {String(option)}
                </Text>

                <Ionicons
                  name={
                    selected
                      ? 'checkmark-circle'
                      : 'chevron-forward'
                  }
                  size={18}
                  color={
                    selected
                      ? theme.accent
                      : theme.textMuted
                  }
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Previous answers */}
      {(absent.length > 0 ||
        unknown.length > 0 ||
        skipped.length > 0) && (
        <View
          style={[
            styles.stateCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.stateHeader}>
            <View
              style={[
                styles.stateHeaderIcon,
                {
                  backgroundColor:
                    theme.accentSoft,
                },
              ]}
            >
              <Ionicons
                name="layers-outline"
                size={15}
                color={theme.accent}
              />
            </View>

            <View style={styles.stateHeaderCopy}>
              <Text
                style={[
                  styles.stateCardTitle,
                  { color: theme.textPrimary },
                ]}
              >
                Answers already considered
              </Text>

              <Text
                style={[
                  styles.stateCardSubtitle,
                  { color: theme.textMuted },
                ]}
              >
                Previous responses are being retained
                for the assessment.
              </Text>
            </View>
          </View>

          {absent.length > 0 && (
            <View style={styles.stateRow}>
              <View
                style={[
                  styles.stateDot,
                  {
                    backgroundColor:
                      theme.textMuted,
                  },
                ]}
              />

              <Text
                style={[
                  styles.stateCardText,
                  { color: theme.textSecondary },
                ]}
              >
                <Text
                  style={{
                    color: theme.textPrimary,
                    fontWeight: '700',
                  }}
                >
                  Denied:
                </Text>{' '}
                {absent
                  .map(item =>
                    String(item).replace(
                      /_/g,
                      ' '
                    )
                  )
                  .join(', ')}
              </Text>
            </View>
          )}

          {unknown.length > 0 && (
            <View style={styles.stateRow}>
              <View
                style={[
                  styles.stateDot,
                  {
                    backgroundColor:
                      theme.warningText,
                  },
                ]}
              />

              <Text
                style={[
                  styles.stateCardText,
                  { color: theme.textSecondary },
                ]}
              >
                <Text
                  style={{
                    color: theme.textPrimary,
                    fontWeight: '700',
                  }}
                >
                  Not sure:
                </Text>{' '}
                {unknown
                  .map(item =>
                    String(item).replace(
                      /_/g,
                      ' '
                    )
                  )
                  .join(', ')}
              </Text>
            </View>
          )}

          {skipped.length > 0 && (
            <View style={styles.stateRow}>
              <View
                style={[
                  styles.stateDot,
                  {
                    backgroundColor:
                      theme.textMuted,
                  },
                ]}
              />

              <Text
                style={[
                  styles.stateCardText,
                  { color: theme.textSecondary },
                ]}
              >
                <Text
                  style={{
                    color: theme.textPrimary,
                    fontWeight: '700',
                  }}
                >
                  Skipped:
                </Text>{' '}
                {skipped
                  .map(item =>
                    String(item).replace(
                      /_/g,
                      ' '
                    )
                  )
                  .join(', ')}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Continue */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          selectedAnswer === 'Skip'
            ? 'Skip this question'
            : 'Continue'
        }
        accessibilityState={{
          disabled:
            !selectedAnswer || loading,
          busy: loading,
        }}
        disabled={!selectedAnswer || loading}
        onPress={handleContinue}
        style={({ pressed }) => [
          styles.primaryButton,
          {
            backgroundColor: theme.accent,
            opacity:
              !selectedAnswer || loading
                ? 0.45
                : pressed
                  ? 0.82
                  : 1,
            shadowColor: theme.accent,
          },
        ]}
      >
        {loading ? (
          <>
            <ActivityIndicator
              size="small"
              color={theme.buttonText}
            />

            <Text
              style={[
                styles.primaryButtonText,
                {
                  color: theme.buttonText,
                },
              ]}
            >
              Processing...
            </Text>
          </>
        ) : (
          <>
            <Text
              style={[
                styles.primaryButtonText,
                {
                  color: theme.buttonText,
                },
              ]}
            >
              {selectedAnswer === 'Skip'
                ? 'Skip Question'
                : 'Continue'}
            </Text>

            <Ionicons
              name={
                selectedAnswer === 'Skip'
                  ? 'play-forward'
                  : 'arrow-forward'
              }
              size={18}
              color={theme.buttonText}
            />
          </>
        )}
      </Pressable>

      <Text
        style={[
          styles.disclaimer,
          { color: theme.textMuted },
        ]}
      >
        You can choose “Not sure” or “Skip” at any time.
        CareSense AI is a decision-support tool and does
        not provide a diagnosis.
      </Text>
    </ScrollView>
  );
}


/* ============================================================
   MAIN SCREEN
============================================================ */

export default function SymptomCheckerScreen({
  navigation,
}) {
  const authContext = useContext(AuthContext) || {};

  const {
    user,
    isDarkMode,
  } = authContext;

  const theme = useMemo(
    () => getTheme(Boolean(isDarkMode)),
    [isDarkMode]
  );

  const [step, setStep] = useState('entry');

  const [symptoms, setSymptoms] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [clarifyData, setClarifyData] =
    useState(null);

  const [clarifications, setClarifications] =
    useState({});


  /* ==========================================================
    SCREEN / STEP ANIMATION
  ========================================================== */

  const fadeAnim = useRef(
    new Animated.Value(0)
  ).current;

  const slideAnim = useRef(
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
            duration: 360,
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
    step,
    fadeAnim,
    slideAnim,
  ]);


  /* ==========================================================
     INITIAL ANALYSIS
  ========================================================== */

  const handleInitialAnalyze =
    useCallback(async () => {
      const trimmedSymptoms =
        symptoms.trim();

      if (!trimmedSymptoms || loading) {
        return;
      }

      setLoading(true);

      try {
        const data =
          await submitSymptoms(
            trimmedSymptoms,
            user?.uid || 'anonymous',
            {},
            {}
          );

        if (
          data?.needs_clarification
        ) {
          setClarifyData(
            data?.clarification_data || {}
          );

          setClarifications({});

          setStep('clarify');

          return;
        }

        navigation.navigate(
          'HealthRecordDetail',
          {
            result: data,
          }
        );
      } catch (error) {
        console.error(
          'Initial symptom analysis failed:',
          error
        );

        const status =
          error?.response?.status;

        const message =
          status === 401 ||
          status === 403
            ? 'Your session could not be verified. Please sign in again and try again.'
            : status >= 500
              ? 'CareSense AI is temporarily unavailable. Please try again in a moment.'
              : 'Unable to reach CareSense AI. Check your connection and try again.';

        Alert.alert(
          'Analysis unavailable',
          message
        );
      } finally {
        setLoading(false);
      }
    }, [
      loading,
      navigation,
      symptoms,
      user?.uid,
    ]);


  /* ==========================================================
     CLARIFICATION SUBMIT
  ========================================================== */

  const handleClarifySubmit =
    useCallback(
      async answer => {
        if (
          !answer ||
          Object.keys(answer).length === 0 ||
          loading
        ) {
          return;
        }

        const trimmedSymptoms =
          symptoms.trim();

        if (!trimmedSymptoms) {
          setStep('entry');
          return;
        }

        setLoading(true);

        try {
          const updatedClarifications = {
            ...clarifications,
            ...answer,
          };

          setClarifications(
            updatedClarifications
          );

          const data =
            await submitSymptoms(
              trimmedSymptoms,
              user?.uid || 'anonymous',
              updatedClarifications,
              {}
            );

          if (
            data?.needs_clarification
          ) {
            setClarifyData(
              data?.clarification_data || {}
            );

            /*
             * Stay on the same step.
             *
             * StepClarify's useEffect will clear the
             * previous selected radio option when the
             * backend returns a new question.
             */
            setStep('clarify');

            return;
          }

          navigation.navigate(
            'HealthRecordDetail',
            {
              result: data,
            }
          );
        } catch (error) {
          console.error(
            'Clarification submission failed:',
            error
          );

          const status =
            error?.response?.status;

          const message =
            status === 401 ||
            status === 403
              ? 'Your session could not be verified. Please sign in again and retry.'
              : status >= 500
                ? 'CareSense AI is temporarily unavailable. Please try again shortly.'
                : 'The answer could not be submitted. Please try again.';

          Alert.alert(
            'Unable to continue',
            message
          );
        } finally {
          setLoading(false);
        }
      },
      [
        clarifications,
        loading,
        navigation,
        symptoms,
        user?.uid,
      ]
    );


  const handleBackToSymptoms = useCallback(() => {
    if (loading) {
      return;
    }

    /*
     * Keep the original symptom text so the user can edit it.
     * Clear clarification state because the previous questions
     * belong to the old symptom set.
     */
    setClarifyData(null);
    setClarifications({});
    setStep('entry');
  }, [loading]);


  /* ==========================================================
     UI
  ========================================================== */

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[
        styles.safeArea,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      <StatusBar
        barStyle={
          isDarkMode
            ? 'light-content'
            : 'dark-content'
        }
        backgroundColor={theme.background}
        translucent={false}
      />

      <KeyboardAvoidingView
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
          },
        ]}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        keyboardVerticalOffset={
          Platform.OS === 'ios'
            ? 90
            : 0
        }
      >
        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [
              {
                translateY: slideAnim,
              },
            ],
          }}
        >
          {step === 'entry' ? (
            <StepEntry
              symptoms={symptoms}
              setSymptoms={setSymptoms}
              onAnalyze={
                handleInitialAnalyze
              }
              loading={loading}
              theme={theme}
            />
          ) : (
            <StepClarify
              data={clarifyData}
              onSubmit={
                handleClarifySubmit
              }
              onBack={
                handleBackToSymptoms
              }
              loading={loading}
              theme={theme}
            />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  screen: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  stepContainer: {
    paddingHorizontal: 18,
  },


  /* ----------------------------------------------------------
     HEADER
  ---------------------------------------------------------- */

  headerBlock: {
    marginBottom: 22,
  },

  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 17,
  },

  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },

  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  stepPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  screenTitle: {
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginBottom: 8,
  },

  screenSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 365,
  },


  /* ----------------------------------------------------------
     SELECTION SUMMARY
  ---------------------------------------------------------- */

  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 17,
    borderWidth: 1,
    padding: 13,
    marginBottom: 16,
  },

  selectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectionCopy: {
    flex: 1,
    marginLeft: 11,
  },

  selectionTitle: {
    fontSize: 13,
    fontWeight: '750',
    marginBottom: 2,
  },

  selectionSubtitle: {
    fontSize: 11,
    lineHeight: 16,
  },

  clearAction: {
    paddingHorizontal: 8,
    paddingVertical: 7,
  },

  clearActionText: {
    fontSize: 12,
    fontWeight: '800',
  },


  /* ----------------------------------------------------------
     SEARCH
  ---------------------------------------------------------- */

  searchBar: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  searchIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    minHeight: 40,
    paddingVertical: 0,
  },


  /* ----------------------------------------------------------
     SECTION
  ---------------------------------------------------------- */

  categoryArea: {
    marginBottom: 17,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },

  sectionCount: {
    fontSize: 11,
    fontWeight: '600',
  },

  categoryScroll: {
    gap: 8,
    paddingRight: 16,
  },

  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  categoryChipText: {
    fontSize: 11,
  },


  /* ----------------------------------------------------------
     CATEGORY / SYMPTOM TAGS
  ---------------------------------------------------------- */

  categorySection: {
    marginBottom: 19,
  },

  categoryHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  categoryAccent: {
    width: 3,
    height: 29,
    borderRadius: 999,
    marginRight: 10,
  },

  categoryHeadingContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  categoryName: {
    fontSize: 14,
    fontWeight: '800',
  },

  categoryCount: {
    fontSize: 10,
    fontWeight: '600',
  },

  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 11,
    borderRadius: 13,
    borderWidth: 1,
  },

  tagCheck: {
    width: 17,
    height: 17,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tagPlus: {
    width: 17,
    height: 17,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },


  /* ----------------------------------------------------------
     EMPTY SEARCH
  ---------------------------------------------------------- */

  emptySearchCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 25,
    alignItems: 'center',
    marginBottom: 20,
  },

  emptySearchIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  emptySearchTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 5,
  },

  emptySearchText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 280,
  },


  /* ----------------------------------------------------------
     DETAILS
  ---------------------------------------------------------- */

  detailsSection: {
    marginTop: 3,
    marginBottom: 18,
  },

  detailsHint: {
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 10,
  },

  textInputCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },

  textInputTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingTop: 13,
    gap: 8,
  },

  textInputIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textInputTopText: {
    fontSize: 11,
    fontWeight: '700',
  },

  textInput: {
    height: 145,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    fontSize: 14,
    lineHeight: 21,
  },

  textInputBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingBottom: 11,
  },

  characterHint: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 5,
  },

  characterHintText: {
    fontSize: 9.5,
    flexShrink: 1,
  },

  characterCount: {
    fontSize: 9.5,
    fontWeight: '700',
  },


  /* ----------------------------------------------------------
     PRIMARY BUTTON
  ---------------------------------------------------------- */

  primaryButton: {
    minHeight: 57,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 18,
    marginBottom: 15,

    elevation: 5,

    shadowOffset: {
      width: 0,
      height: 7,
    },

    shadowOpacity: 0.22,
    shadowRadius: 14,
  },

  primaryButtonIcon: {
    width: 25,
    height: 25,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },

  primaryButtonText: {
    fontSize: 15,
    fontWeight: '850',
  },


  /* ----------------------------------------------------------
     DISCLAIMER
  ---------------------------------------------------------- */

  disclaimerCard: {
    flexDirection: 'row',
    gap: 9,
    alignItems: 'flex-start',
    borderRadius: 15,
    borderWidth: 1,
    padding: 12,
    marginBottom: 4,
  },

  disclaimerText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 16,
  },

  disclaimer: {
    textAlign: 'center',
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 3,
    paddingHorizontal: 10,
  },


  /* ----------------------------------------------------------
     PROGRESS
  ---------------------------------------------------------- */

  progressCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    marginBottom: 15,
  },

  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
  },

  progressValue: {
    fontSize: 12,
    fontWeight: '800',
  },

  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 999,
  },

  progressHint: {
    fontSize: 9.5,
    marginTop: 8,
  },


  /* ----------------------------------------------------------
     RED FLAG
  ---------------------------------------------------------- */

  redFlagCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 17,
    borderWidth: 1,
    padding: 13,
    marginBottom: 15,
  },

  redFlagIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  redFlagContent: {
    flex: 1,
  },

  redFlagTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 3,
  },

  redFlagText: {
    fontSize: 11,
    lineHeight: 17,
  },


  /* ----------------------------------------------------------
     QUESTION
  ---------------------------------------------------------- */

  questionCard: {
    borderRadius: 19,
    borderWidth: 1,
    padding: 16,
    marginBottom: 15,
  },

  questionCardTop: {
    flexDirection: 'row',
    marginBottom: 13,
  },

  questionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  questionBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  questionText: {
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 27,
    letterSpacing: -0.2,
    marginBottom: 17,
  },

  optionsWrap: {
    gap: 9,
  },

  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 55,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 13,
  },

  optionRadio: {
    width: 21,
    height: 21,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  optionRadioDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },

  optionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '650',
  },


  /* ----------------------------------------------------------
     PREVIOUS STATE
  ---------------------------------------------------------- */

  stateCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 15,
  },

  stateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  stateHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  stateHeaderCopy: {
    flex: 1,
  },

  stateCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },

  stateCardSubtitle: {
    fontSize: 9.5,
    lineHeight: 14,
  },

  stateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },

  stateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
    marginRight: 8,
  },

  stateCardText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 16,
  },


  /* ----------------------------------------------------------
     COMPLETION
  ---------------------------------------------------------- */

  completionCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 26,
    alignItems: 'center',
    marginBottom: 18,
  },

  completionIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
  },

  completionTitle: {
    fontSize: 21,
    fontWeight: '850',
    marginBottom: 7,
  },

  completionText: {
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 290,
  },

  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },

  backButtonText: {
    fontSize: 12,
    fontWeight: '750',
  },

  safeArea: {
    flex: 1,
  },
});