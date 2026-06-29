import { useMutation, useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import {
  BriefcaseBusiness,
  Camera,
  Edit3,
  Globe2,
  Languages,
  MapPin,
  Phone,
  ShieldCheck,
  Stethoscope,
  X,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

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
  useThemePalette,
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
import { displayLabel, verificationStatusLabel } from "../../src/lib/format";
import { usePreferences, useT } from "../../src/lib/preferences";
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

function isProfessionalProfile(
  profile: MobileProfile,
): profile is ProfessionalProfile {
  return "fullName" in profile;
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
  const { language } = usePreferences();
  const text = useTextStyles();
  const palette = useThemePalette();
  const { width } = useWindowDimensions();
  const isClinic = session?.principal.role === "clinic";
  const compactProfileHero = width < 370;
  const [isEditingDetails, setIsEditingDetails] = useState(false);
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
  const [confirmPassword, setConfirmPassword] = useState("");

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
  const clinicProfile: ClinicProfile | undefined =
    profile && isClinicProfile(profile) ? profile : undefined;
  const professionalProfile: ProfessionalProfile | undefined =
    profile && isProfessionalProfile(profile) ? profile : undefined;
  const imageUrl = clinicProfile
    ? clinicProfile.logoUrl
    : professionalProfile
      ? professionalProfile.profileImageUrl
      : session?.principal.profileImageUrl;

  const displayName = clinicProfile
    ? clinicProfile.organizationName
    : professionalProfile
      ? professionalProfile.fullName
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
            cleanFacilityType(facilityType) || "healthcare_facility",
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
      setIsEditingDetails(false);
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
      if (newPassword !== confirmPassword) {
        throw new Error(t("profile.passwordMismatch"));
      }
      return updatePassword({
        currentPassword,
        password: newPassword,
      });
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
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
      {profileQuery.isLoading && !profileQuery.data ? (
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
        <View
          style={[
            styles.profileHero,
            compactProfileHero && styles.profileHeroCompact,
          ]}
        >
          <View>
            <Avatar label={displayName} size={92} uri={imageUrl} />
            <Pressable
              accessibilityLabel={
                isClinic ? t("profile.uploadLogo") : t("profile.uploadPhoto")
              }
              accessibilityRole="button"
              disabled={imageMutation.isPending}
              hitSlop={8}
              onPress={() => imageMutation.mutate()}
              style={[
                styles.photoAction,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <Camera color={colors.primary} size={17} />
            </Pressable>
          </View>
          <View
            style={[
              styles.profileHeroCopy,
              compactProfileHero && styles.profileHeroCopyCompact,
            ]}
          >
            <Text style={text.h2}>{displayName}</Text>
            {clinicProfile ? (
              <Text style={text.body}>
                {displayLabel(
                  cleanFacilityType(clinicProfile.facilityType) ||
                    "healthcare_facility",
                  language,
                )}
              </Text>
            ) : professionalProfile ? (
              <Text style={text.body}>
                {displayLabel(
                  professionalProfile.headline || professionalProfile.specialty,
                  language,
                )}
              </Text>
            ) : null}
            {session?.principal.email ? (
              <Text style={text.body}>{session.principal.email}</Text>
            ) : null}
            <View style={styles.badgeRow}>
              <Badge
                tone={
                  session?.principal.verificationStatus === "approved"
                    ? "success"
                    : "warning"
                }
              >
                {session?.principal.verificationStatus === "approved"
                  ? t("verification.approved")
                  : verificationStatusLabel(
                      session?.principal.verificationStatus,
                      language,
                    )}
              </Badge>
              <Badge
                tone={profile?.onboardingCompleted ? "success" : "warning"}
              >
                {profile?.onboardingCompleted
                  ? t("profile.onboardingComplete")
                  : t("profile.onboardingIncomplete")}
              </Badge>
            </View>
          </View>
        </View>
      </Card>

      <Card>
        <EditableSectionHeader
          editing={isEditingDetails}
          onCancel={() => {
            if (profile) {
              setSelectedLocation(findProfileLocation(profile));
              if (isClinicProfile(profile)) {
                setDisplayNameDraft(profile.organizationName);
                setPhone(normalizeYemenPhoneInput(profile.contactPhone ?? ""));
                setDescription(profile.description ?? "");
                setFacilityType(cleanFacilityType(profile.facilityType));
                setWebsiteUrl(profile.websiteUrl ?? "");
              } else {
                setDisplayNameDraft(profile.fullName);
                setPhone(normalizeYemenPhoneInput(profile.primaryPhone ?? ""));
                setDescription(profile.bio ?? "");
                setHeadline(profile.headline ?? "");
                setSpecialty(profile.specialty);
                setLicenseDetails(profile.licenseNumber ?? "");
                setYearsExperience(String(profile.yearsExperience));
                setLanguagesText(profile.languages.join(", "));
                setAvailabilityStatus(profile.availability.status);
                setLocationRadiusKm(
                  String(profile.availability.locationRadiusKm),
                );
              }
            }
            setPhoneTouched(false);
            setLocationTouched(false);
            setIsEditingDetails(false);
          }}
          onEdit={() => setIsEditingDetails(true)}
          title={t("profile.profileDetails")}
        />
        {isEditingDetails ? (
          <>
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
                  autoCapitalize="words"
                  label={t("profile.facilityType")}
                  onChangeText={setFacilityType}
                  returnKeyType="next"
                  value={facilityType}
                />
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
                        ? joinUnique(
                            values.filter((value) => value !== item.name),
                          )
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
              label={
                isClinic ? t("profile.facilityDescription") : t("profile.bio")
              }
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
          </>
        ) : (
          <View style={styles.detailsStack}>
            <DetailRow
              icon={<Phone color={colors.primary} size={18} />}
              label={t("profile.yemenPhone")}
              value={
                clinicProfile?.contactPhone ?? professionalProfile?.primaryPhone
              }
            />
            <DetailRow
              icon={<MapPin color={colors.primary} size={18} />}
              label={t("profile.location")}
              value={
                profile?.city || profile?.region
                  ? [profile.city, profile.region].filter(Boolean).join(", ")
                  : undefined
              }
            />
            {clinicProfile ? (
              <>
                <DetailRow
                  icon={<BriefcaseBusiness color={colors.primary} size={18} />}
                  label={t("profile.facilityType")}
                  value={displayLabel(
                    cleanFacilityType(clinicProfile.facilityType),
                    language,
                  )}
                />
                <DetailRow
                  icon={<Globe2 color={colors.primary} size={18} />}
                  label={t("profile.website")}
                  value={clinicProfile.websiteUrl}
                />
                <DetailRow
                  icon={<ShieldCheck color={colors.primary} size={18} />}
                  label={t("profile.services")}
                  value={
                    clinicProfile.services.length
                      ? clinicProfile.services
                          .map((service) => displayLabel(service, language))
                          .join(", ")
                      : undefined
                  }
                />
                <DetailRow
                  label={t("profile.facilityDescription")}
                  value={clinicProfile.description}
                />
              </>
            ) : professionalProfile ? (
              <>
                <DetailRow
                  icon={<Stethoscope color={colors.primary} size={18} />}
                  label={t("profile.specialty")}
                  value={displayLabel(professionalProfile.specialty, language)}
                />
                <DetailRow
                  label={t("profile.headline")}
                  value={displayLabel(professionalProfile.headline, language)}
                />
                <DetailRow
                  icon={<BriefcaseBusiness color={colors.primary} size={18} />}
                  label={t("profile.yearsExperience")}
                  value={`${professionalProfile.yearsExperience}`}
                />
                <DetailRow
                  icon={<Languages color={colors.primary} size={18} />}
                  label={t("profile.languages")}
                  value={professionalProfile.languages.join(", ")}
                />
                <DetailRow
                  icon={<ShieldCheck color={colors.primary} size={18} />}
                  label={t("profile.licenseDetails")}
                  value={displayLabel(
                    professionalProfile.licenseNumber,
                    language,
                  )}
                />
                <DetailRow
                  label={t("profile.availability")}
                  value={t(
                    `profile.availability.${professionalProfile.availability.status}`,
                  )}
                />
                <DetailRow
                  label={t("profile.locationRadius")}
                  value={
                    language === "ar"
                      ? `${professionalProfile.availability.locationRadiusKm} كم`
                      : `${professionalProfile.availability.locationRadiusKm} km`
                  }
                />
                <DetailRow
                  label={t("profile.bio")}
                  value={professionalProfile.bio}
                />
              </>
            ) : null}
          </View>
        )}
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
              returnKeyType="next"
              secureTextEntry
              textContentType="newPassword"
              value={newPassword}
            />
            <Field
              autoComplete="new-password"
              error={
                confirmPassword.length > 0 && newPassword !== confirmPassword
                  ? t("profile.passwordMismatch")
                  : undefined
              }
              label={t("profile.confirmPassword")}
              onChangeText={setConfirmPassword}
              returnKeyType="done"
              secureTextEntry
              textContentType="newPassword"
              value={confirmPassword}
            />
            <View style={styles.actions}>
              <Button
                disabled={
                  currentPassword.length < 8 ||
                  newPassword.length < 8 ||
                  confirmPassword.length < 8 ||
                  newPassword !== confirmPassword
                }
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
                  setConfirmPassword("");
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

function EditableSectionHeader({
  editing,
  onCancel,
  onEdit,
  title,
}: {
  editing: boolean;
  onCancel: () => void;
  onEdit: () => void;
  title: string;
}) {
  const { direction } = usePreferences();
  const text = useTextStyles();
  const palette = useThemePalette();
  const t = useT();
  const isRTL = direction === "rtl";

  return (
    <View style={[styles.sectionTop, isRTL && styles.rowReverse]}>
      <Text style={text.strong}>{title}</Text>
      <Pressable
        accessibilityLabel={editing ? t("common.cancel") : t("profile.edit")}
        accessibilityRole="button"
        hitSlop={8}
        onPress={editing ? onCancel : onEdit}
        style={({ pressed }) => [
          styles.iconAction,
          {
            backgroundColor: palette.surfaceMuted,
            borderColor: palette.border,
          },
          pressed && styles.iconActionPressed,
        ]}
      >
        {editing ? (
          <X color={colors.primary} size={18} />
        ) : (
          <Edit3 color={colors.primary} size={18} />
        )}
      </Pressable>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value?: number | string | null;
}) {
  const { direction } = usePreferences();
  const text = useTextStyles();
  const palette = useThemePalette();
  const t = useT();
  const isRTL = direction === "rtl";
  const displayValue =
    value == null || String(value).trim() === ""
      ? t("profile.notAdded")
      : String(value);

  return (
    <View
      style={[
        styles.detailRow,
        {
          backgroundColor: palette.surfaceMuted,
          borderColor: palette.border,
        },
        isRTL && styles.rowReverse,
      ]}
    >
      {icon ? <View style={styles.detailIcon}>{icon}</View> : null}
      <View style={styles.grow}>
        <Text style={[text.body, styles.detailLabel]}>{label}</Text>
        <Text
          style={[
            text.strong,
            displayValue === t("profile.notAdded") && {
              color: palette.muted,
            },
          ]}
        >
          {displayValue}
        </Text>
      </View>
    </View>
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
  const { language } = usePreferences();

  if (loading) return <LoadingBlock label={t("common.loading")} />;
  if (!items.length) {
    return <Text style={text.body}>{t("profile.noOptions")}</Text>;
  }

  return (
    <View style={styles.chipGrid}>
      {items.map((item) => {
        const selected = selectedValues.includes(item.name);
        const label =
          language === "ar" && item.nameAr
            ? item.nameAr
            : displayLabel(item.name, language);
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
              {label}
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
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  detailIcon: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  detailLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  detailRow: {
    alignItems: "center",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  detailsStack: {
    gap: 9,
  },
  iconAction: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  iconActionPressed: {
    transform: [{ scale: 0.97 }],
  },
  photoAction: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    bottom: -2,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    width: 34,
  },
  profileHero: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  profileHeroCompact: {
    alignItems: "flex-start",
    flexDirection: "column",
  },
  profileHeroCopy: {
    flex: 1,
    gap: 7,
  },
  profileHeroCopyCompact: {
    width: "100%",
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  sectionTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  success: {
    color: colors.success,
    fontWeight: "800",
  },
  selectorBlock: {
    gap: 9,
  },
});
