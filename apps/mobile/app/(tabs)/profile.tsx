import { useMutation, useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  createLocationSelection,
  LocationField,
  toLocationValue,
  type LocationSelection,
} from "../../src/components/LocationField";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ErrorBanner,
  Field,
  LoadingBlock,
  PreferenceControls,
  Screen,
  SectionHeader,
  colors,
  useTextStyles,
} from "../../src/components/ui";
import { AppHeaderActions } from "../../src/components/AppHeaderActions";
import {
  formatYemenPhone,
  normalizeYemenPhoneInput,
  validateYemenPhone,
} from "../../src/config";
import {
  getMyClinicProfile,
  getMyProfessionalProfile,
  listCatalogItems,
  requestEmailVerification,
  updateMyClinicProfile,
  updatePassword,
  updateMyProfessionalProfile,
  uploadProfileImage,
} from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { useT } from "../../src/lib/preferences";
import { queryClient } from "../../src/lib/query";
import type {
  CatalogItem,
  ClinicProfile,
  ProfessionalProfile,
} from "../../src/types";

type MobileProfile = ClinicProfile | ProfessionalProfile;

function isClinicProfile(profile: MobileProfile): profile is ClinicProfile {
  return "organizationName" in profile;
}

function activeCatalogItems(items?: CatalogItem[]) {
  return (items ?? [])
    .filter((item) => item.isActive)
    .sort(
      (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
    );
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinUnique(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  ).join(", ");
}

function findProfileLocation(profile?: MobileProfile) {
  return createLocationSelection(
    profile
      ? {
          city: profile.city,
          latitude: profile.latitude,
          longitude: profile.longitude,
          region: profile.region,
        }
      : null,
  );
}

function cleanFacilityType(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed.toLowerCase() === "pending onboarding" ? "" : trimmed;
}

export default function ProfileScreen() {
  const { logout, session } = useAuth();
  const t = useT();
  const text = useTextStyles();
  const isClinic = session?.principal.role === "clinic";
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [headline, setHeadline] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [licenseDetails, setLicenseDetails] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [languagesText, setLanguagesText] = useState("ar, en");
  const [availabilityStatus, setAvailabilityStatus] =
    useState<ProfessionalProfile["availability"]["status"]>("available");
  const [locationRadiusKm, setLocationRadiusKm] = useState("25");
  const [facilityType, setFacilityType] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationSelection>(
    createLocationSelection(),
  );
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [locationTouched, setLocationTouched] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const profileQuery = useQuery<MobileProfile>({
    queryFn: () =>
      isClinic ? getMyClinicProfile() : getMyProfessionalProfile(),
    queryKey: ["profile", session?.principal.role],
  });
  const specialtiesQuery = useQuery({
    enabled: !isClinic,
    queryFn: () => listCatalogItems("specialty"),
    queryKey: ["catalog", "specialty"],
  });
  const certificationsQuery = useQuery({
    enabled: !isClinic,
    queryFn: () => listCatalogItems("certification"),
    queryKey: ["catalog", "certification"],
  });

  const specialtyOptions = activeCatalogItems(specialtiesQuery.data?.items);
  const certificationOptions = activeCatalogItems(
    certificationsQuery.data?.items,
  );

  const profile = profileQuery.data;
  const imageUrl =
    profile && isClinicProfile(profile)
      ? profile.logoUrl
      : profile && !isClinicProfile(profile)
        ? profile.profileImageUrl
        : session?.principal.profileImageUrl;

  const displayName =
    profile && isClinicProfile(profile)
      ? profile.organizationName
      : profile && !isClinicProfile(profile)
        ? profile.fullName
        : session?.principal.displayName;

  useEffect(() => {
    if (!profile) return;
    setSelectedLocation(findProfileLocation(profile));
    if (isClinicProfile(profile)) {
      setDisplayNameDraft(profile.organizationName);
      setPhone(normalizeYemenPhoneInput(profile.contactPhone ?? ""));
      setDescription(profile.description ?? "");
      setFacilityType(cleanFacilityType(profile.facilityType));
      setWebsiteUrl(profile.websiteUrl ?? "");
      return;
    }

    setDisplayNameDraft(profile.fullName);
    setPhone(normalizeYemenPhoneInput(profile.primaryPhone ?? ""));
    setDescription(profile.bio ?? "");
    setHeadline(profile.headline ?? "");
    setSpecialty(profile.specialty);
    setLicenseDetails(profile.licenseNumber ?? "");
    setYearsExperience(String(profile.yearsExperience));
    setLanguagesText(profile.languages.join(", "));
    setAvailabilityStatus(profile.availability.status);
    setLocationRadiusKm(String(profile.availability.locationRadiusKm));
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      const normalizedPhone = formatYemenPhone(phone);

      if (!validateYemenPhone(phone)) {
        throw new Error(t("profile.yemenPhoneError"));
      }
      if (
        selectedLocation.latitude == null ||
        selectedLocation.longitude == null
      ) {
        throw new Error(t("location.mustSelect"));
      }

      if (isClinic) {
        if (!displayNameDraft.trim()) throw new Error(t("validation.name"));
        await updateMyClinicProfile({
          organizationName: displayNameDraft.trim(),
          facilityType:
            cleanFacilityType(facilityType) || "Healthcare facility",
          contactPhone: normalizedPhone,
          description:
            description ||
            (isClinicProfile(profile) ? profile.description : ""),
          location: toLocationValue(selectedLocation),
          services: isClinicProfile(profile) ? profile.services : [],
          websiteUrl: websiteUrl.trim() || undefined,
        });
      } else {
        const years = Number(yearsExperience);
        const radius = Number(locationRadiusKm);

        if (!displayNameDraft.trim()) throw new Error(t("validation.name"));
        if (!specialty.trim()) throw new Error(t("profile.specialtyRequired"));
        if (!Number.isInteger(years) || years < 0) {
          throw new Error(t("profile.yearsError"));
        }
        if (!Number.isInteger(radius) || radius <= 0) {
          throw new Error(t("profile.radiusError"));
        }

        await updateMyProfessionalProfile({
          availability: {
            locationRadiusKm: radius,
            status: availabilityStatus,
          },
          bio: description || (!isClinicProfile(profile) ? profile.bio : ""),
          fullName: displayNameDraft.trim(),
          headline: headline.trim() || undefined,
          languages: splitCsv(languagesText).length
            ? splitCsv(languagesText)
            : ["ar"],
          licenseNumber: licenseDetails.trim() || undefined,
          location: toLocationValue(selectedLocation),
          primaryPhone: normalizedPhone,
          specialty: specialty.trim(),
          yearsExperience: years,
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
  const imageMutation = useMutation({
    mutationFn: async () => {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error(t("profile.imagePermission"));
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ["images"],
        quality: 0.86,
      });

      if (picked.canceled || !picked.assets[0]) return null;

      return uploadProfileImage({
        mimeType: picked.assets[0].mimeType,
        name: picked.assets[0].fileName,
        uri: picked.assets[0].uri,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
  const verificationMutation = useMutation({
    mutationFn: async () => {
      if (!session?.principal.email) throw new Error(t("profile.emailMissing"));
      return requestEmailVerification(session.principal.email);
    },
  });
  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (currentPassword.length < 8 || newPassword.length < 8) {
        throw new Error(t("profile.passwordLength"));
      }
      return updatePassword({
        currentPassword,
        password: newPassword,
      });
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setShowPasswordForm(false);
    },
  });

  const phoneError =
    phoneTouched && !validateYemenPhone(phone)
      ? t("profile.yemenPhoneError")
      : undefined;
  const locationError =
    locationTouched &&
    (selectedLocation.latitude == null || selectedLocation.longitude == null)
      ? t("location.mustSelect")
      : undefined;

  return (
    <Screen
      headerEnd={<AppHeaderActions />}
      onRefresh={() => void profileQuery.refetch()}
      refreshing={profileQuery.isFetching}
      title={t("profile.title")}
    >
      {profileQuery.isLoading ? (
        <LoadingBlock label={t("profile.loading")} />
      ) : null}
      <ErrorBanner
        message={
          profileQuery.error instanceof Error
            ? profileQuery.error.message
            : saveMutation.error instanceof Error
              ? saveMutation.error.message
              : imageMutation.error instanceof Error
                ? imageMutation.error.message
                : specialtiesQuery.error instanceof Error
                  ? specialtiesQuery.error.message
                  : certificationsQuery.error instanceof Error
                    ? certificationsQuery.error.message
                    : verificationMutation.error instanceof Error
                      ? verificationMutation.error.message
                      : passwordMutation.error instanceof Error
                        ? passwordMutation.error.message
                        : undefined
        }
      />

      <Card>
        <View style={styles.profileHeader}>
          <Avatar label={displayName} size={76} uri={imageUrl} />
          <View style={styles.grow}>
            <Text style={text.h2}>{displayName}</Text>
            {session?.principal.email ? (
              <Text style={text.body}>{session.principal.email}</Text>
            ) : null}
            <Badge
              tone={
                session?.principal.verificationStatus === "approved"
                  ? "success"
                  : "warning"
              }
            >
              {session?.principal.verificationStatus.replace("_", " ")}
            </Badge>
          </View>
        </View>
        <Button
          loading={imageMutation.isPending}
          onPress={() => imageMutation.mutate()}
          tone="secondary"
        >
          {isClinic ? t("profile.uploadLogo") : t("profile.uploadPhoto")}
        </Button>
      </Card>

      <Card>
        <SectionHeader title={t("profile.profileDetails")} />
        <Text style={text.body}>{t("profile.yemenFixed")}</Text>
        <Field
          autoCapitalize="words"
          label={
            isClinic ? t("profile.organizationName") : t("profile.fullName")
          }
          onChangeText={setDisplayNameDraft}
          returnKeyType="next"
          value={displayNameDraft}
        />
        <Field
          autoComplete="tel"
          error={phoneError}
          keyboardType="phone-pad"
          label={t("profile.yemenPhone")}
          onChangeText={(value) => {
            setPhoneTouched(true);
            setPhone(normalizeYemenPhoneInput(value));
          }}
          placeholder="77xxxxxxx"
          returnKeyType="next"
          textContentType="telephoneNumber"
          value={phone}
        />
        <LocationField
          error={locationError}
          onChange={(location) => {
            setLocationTouched(true);
            setSelectedLocation(location);
          }}
          value={selectedLocation}
        />
        {isClinic ? (
          <>
            <Field
              autoCapitalize="none"
              autoComplete="url"
              keyboardType="url"
              label={t("profile.website")}
              onChangeText={setWebsiteUrl}
              returnKeyType="next"
              value={websiteUrl}
            />
          </>
        ) : (
          <>
            <Field
              label={t("profile.headline")}
              onChangeText={setHeadline}
              returnKeyType="next"
              value={headline}
            />
            <Text style={text.strong}>{t("profile.specialty")}</Text>
            <CatalogChips
              items={specialtyOptions}
              loading={specialtiesQuery.isLoading}
              onSelect={(item) => setSpecialty(item.name)}
              selectedValues={[specialty]}
            />
            <Field
              keyboardType="number-pad"
              label={t("profile.yearsExperience")}
              onChangeText={setYearsExperience}
              returnKeyType="next"
              value={yearsExperience}
            />
            <Field
              label={t("profile.languages")}
              onChangeText={setLanguagesText}
              placeholder="ar, en"
              returnKeyType="next"
              value={languagesText}
            />
            <Text style={text.strong}>{t("profile.certifications")}</Text>
            <CatalogChips
              items={certificationOptions}
              loading={certificationsQuery.isLoading}
              multiple
              onSelect={(item) => {
                const values = splitCsv(licenseDetails);
                setLicenseDetails(
                  values.includes(item.name)
                    ? joinUnique(values.filter((value) => value !== item.name))
                    : joinUnique([...values, item.name]),
                );
              }}
              selectedValues={splitCsv(licenseDetails)}
            />
            <Field
              label={t("profile.licenseDetails")}
              multiline
              onChangeText={setLicenseDetails}
              placeholder={t("profile.commaSeparated")}
              returnKeyType="default"
              value={licenseDetails}
            />
            <AvailabilitySelector
              onSelect={setAvailabilityStatus}
              selected={availabilityStatus}
            />
            <Field
              keyboardType="number-pad"
              label={t("profile.locationRadius")}
              onChangeText={setLocationRadiusKm}
              returnKeyType="done"
              value={locationRadiusKm}
            />
          </>
        )}
        <Field
          label={isClinic ? t("profile.facilityDescription") : t("profile.bio")}
          multiline
          onChangeText={setDescription}
          returnKeyType="default"
          value={description}
        />
        <Button
          loading={saveMutation.isPending}
          onPress={() => saveMutation.mutate()}
        >
          {t("profile.save")}
        </Button>
      </Card>

      <Card>
        <SectionHeader title={t("settings.title")} />
        <Text style={text.body}>{t("settings.preferencesBody")}</Text>
        <PreferenceControls />
      </Card>

      <Card>
        <SectionHeader title={t("profile.accountSecurity")} />
        <Text style={text.body}>
          {session?.principal.emailVerified
            ? t("profile.emailVerified")
            : t("profile.emailUnverified")}
        </Text>
        {!session?.principal.emailVerified ? (
          <>
            <Button
              loading={verificationMutation.isPending}
              onPress={() => verificationMutation.mutate()}
              tone="secondary"
            >
              {t("profile.resendVerification")}
            </Button>
            {verificationMutation.isSuccess ? (
              <Text style={styles.success}>
                {t("profile.verificationSent")}
              </Text>
            ) : null}
          </>
        ) : null}
        {showPasswordForm ? (
          <>
            <Field
              autoComplete="current-password"
              label={t("profile.currentPassword")}
              onChangeText={setCurrentPassword}
              returnKeyType="next"
              secureTextEntry
              textContentType="password"
              value={currentPassword}
            />
            <Field
              autoComplete="new-password"
              label={t("profile.newPassword")}
              onChangeText={setNewPassword}
              returnKeyType="done"
              secureTextEntry
              textContentType="newPassword"
              value={newPassword}
            />
            <View style={styles.actions}>
              <Button
                disabled={currentPassword.length < 8 || newPassword.length < 8}
                loading={passwordMutation.isPending}
                onPress={() => passwordMutation.mutate()}
                tone="secondary"
              >
                {t("profile.savePassword")}
              </Button>
              <Button
                onPress={() => {
                  setCurrentPassword("");
                  setNewPassword("");
                  setShowPasswordForm(false);
                }}
                tone="secondary"
              >
                {t("common.cancel")}
              </Button>
            </View>
          </>
        ) : (
          <Button onPress={() => setShowPasswordForm(true)} tone="secondary">
            {t("profile.changePassword")}
          </Button>
        )}
        {passwordMutation.isSuccess ? (
          <Text style={styles.success}>{t("profile.passwordChanged")}</Text>
        ) : null}
      </Card>

      <Card>
        <SectionHeader title={t("settings.account")} />
        <Text style={text.body}>{t("settings.accountBody")}</Text>
        <Button onPress={logout} tone="danger">
          {t("profile.logout")}
        </Button>
      </Card>
    </Screen>
  );
}

function CatalogChips({
  items,
  loading,
  multiple,
  onSelect,
  selectedValues,
}: {
  items: CatalogItem[];
  loading?: boolean;
  multiple?: boolean;
  onSelect: (item: CatalogItem) => void;
  selectedValues: string[];
}) {
  const t = useT();
  const text = useTextStyles();

  if (loading) return <LoadingBlock label={t("common.loading")} />;
  if (!items.length) {
    return <Text style={text.body}>{t("profile.noOptions")}</Text>;
  }

  return (
    <View style={styles.chipGrid}>
      {items.map((item) => {
        const selected = selectedValues.includes(item.name);
        return (
          <Pressable
            accessibilityRole={multiple ? "checkbox" : "radio"}
            accessibilityState={{ checked: selected }}
            key={item.id}
            onPress={() => onSelect(item)}
            style={[styles.chip, selected ? styles.chipSelected : undefined]}
          >
            <Text
              style={[
                styles.chipText,
                selected ? styles.chipTextSelected : undefined,
              ]}
            >
              {item.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AvailabilitySelector({
  onSelect,
  selected,
}: {
  onSelect: (status: ProfessionalProfile["availability"]["status"]) => void;
  selected: ProfessionalProfile["availability"]["status"];
}) {
  const t = useT();
  const text = useTextStyles();
  const options: ProfessionalProfile["availability"]["status"][] = [
    "available",
    "limited",
    "unavailable",
  ];

  return (
    <View style={styles.selectorBlock}>
      <Text style={text.strong}>{t("profile.availability")}</Text>
      <View style={styles.chipGrid}>
        {options.map((option) => {
          const isSelected = option === selected;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              key={option}
              onPress={() => onSelect(option)}
              style={[
                styles.chip,
                isSelected ? styles.chipSelected : undefined,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  isSelected ? styles.chipTextSelected : undefined,
                ]}
              >
                {t(`profile.availability.${option}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 10,
  },
  chip: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  chipTextSelected: {
    color: colors.primaryDark,
  },
  grow: {
    flex: 1,
    gap: 6,
  },
  profileHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  success: {
    color: colors.success,
    fontWeight: "800",
  },
  selectorBlock: {
    gap: 9,
  },
});
