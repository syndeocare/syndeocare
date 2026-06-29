import { useMutation, useQuery } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { FileText } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  LoadingBlock,
  Screen,
  SectionHeader,
  colors,
  useTextStyles,
  useThemePalette,
} from "../src/components/ui";
import {
  YEMEN_LOCATIONS,
  formatYemenPhone,
  validateYemenPhone,
  type YemenLocation,
} from "../src/config";
import {
  authenticatedRequest,
  getMyClinicProfile,
  getMyProfessionalProfile,
  getOnboardingStatus,
  listCatalogItems,
  submitOnboarding,
  updateMyClinicProfile,
  updateMyProfessionalProfile,
  uploadProfileImage,
} from "../src/lib/api";
import { useAuth } from "../src/lib/auth";
import { interpolate, useT } from "../src/lib/preferences";
import { queryClient } from "../src/lib/query";
import type {
  CatalogItem,
  ClinicProfile,
  LocationValue,
  OnboardingStatus,
  ProfessionalProfile,
} from "../src/types";

type UploadDescriptor = {
  bucket: string;
  key: string;
  uploadHeaders: { "content-type": string };
  uploadMethod: "PUT";
  uploadUrl: string;
};

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

function toLocationValue(location: YemenLocation): LocationValue {
  return {
    city: location.city,
    latitude: location.latitude,
    longitude: location.longitude,
    region: location.region,
  };
}

function findProfileLocation(profile?: MobileProfile) {
  if (!profile) return YEMEN_LOCATIONS[0];
  return (
    YEMEN_LOCATIONS.find(
      (location) =>
        location.city.toLowerCase() === profile.city.toLowerCase() &&
        location.region.toLowerCase() === profile.region.toLowerCase(),
    ) ?? {
      city: profile.city,
      latitude: profile.latitude ?? YEMEN_LOCATIONS[0].latitude,
      longitude: profile.longitude ?? YEMEN_LOCATIONS[0].longitude,
      region: profile.region,
    }
  );
}

async function uploadDocument(
  documentType: string,
  uploadFailedMessage: string,
) {
  const picked = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: ["application/pdf", "image/*"],
  });

  if (picked.canceled || !picked.assets[0]) return;
  const asset = picked.assets[0];
  const contentType = asset.mimeType ?? "application/octet-stream";

  const descriptor = await authenticatedRequest<UploadDescriptor>(
    "/uploads/verification-document",
    {
      body: JSON.stringify({ contentType, fileName: asset.name }),
      method: "POST",
    },
  );

  const blob = await fetch(asset.uri).then((response) => response.blob());
  const uploaded = await fetch(descriptor.uploadUrl, {
    body: blob,
    headers: descriptor.uploadHeaders,
    method: descriptor.uploadMethod,
  });

  if (!uploaded.ok) throw new Error(uploadFailedMessage);

  await authenticatedRequest("/uploads/verification-document/complete", {
    body: JSON.stringify({
      bucket: descriptor.bucket,
      documentType,
      key: descriptor.key,
    }),
    method: "POST",
  });
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { refresh, session } = useAuth();
  const t = useT();
  const text = useTextStyles();
  const palette = useThemePalette();
  const isClinic = session?.principal.role === "clinic";
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [licenseDetails, setLicenseDetails] = useState("");
  const [yearsExperience, setYearsExperience] = useState("0");
  const [languagesText, setLanguagesText] = useState("ar, en");
  const [facilityType, setFacilityType] = useState("");
  const [servicesText, setServicesText] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<YemenLocation>(
    YEMEN_LOCATIONS[0],
  );
  const statusQuery = useQuery({
    queryFn: getOnboardingStatus,
    queryKey: ["onboarding"],
  });
  const profileQuery = useQuery<MobileProfile>({
    enabled: Boolean(session),
    queryFn: () =>
      isClinic ? getMyClinicProfile() : getMyProfessionalProfile(),
    queryKey: ["profile", session?.principal.role, "onboarding"],
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

  const profile = profileQuery.data;
  const specialtyOptions = activeCatalogItems(specialtiesQuery.data?.items);
  const certificationOptions = activeCatalogItems(
    certificationsQuery.data?.items,
  );
  const imageUrl =
    profile && isClinicProfile(profile)
      ? profile.logoUrl
      : profile && !isClinicProfile(profile)
        ? profile.profileImageUrl
        : session?.principal.profileImageUrl;

  useEffect(() => {
    if (!profile) return;
    setSelectedLocation(findProfileLocation(profile));
    if (isClinicProfile(profile)) {
      setDisplayNameDraft(profile.organizationName);
      setPhone(profile.contactPhone?.replace(/^\+967/, "") ?? "");
      setDescription(profile.description ?? "");
      setFacilityType(profile.facilityType);
      setServicesText(profile.services.join(", "));
      return;
    }

    setDisplayNameDraft(profile.fullName);
    setPhone(profile.primaryPhone?.replace(/^\+967/, "") ?? "");
    setDescription(profile.bio ?? "");
    setSpecialty(profile.specialty);
    setLicenseDetails(profile.licenseNumber ?? "");
    setYearsExperience(String(profile.yearsExperience));
    setLanguagesText(profile.languages.join(", "));
  }, [profile]);

  const uploadMutation = useMutation({
    mutationFn: (documentType: string) =>
      uploadDocument(documentType, t("onboarding.uploadFailed")),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["onboarding"] });
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
  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      const normalizedPhone = phone ? formatYemenPhone(phone) : undefined;

      if (!displayNameDraft.trim()) throw new Error(t("validation.name"));
      if (phone && !validateYemenPhone(phone)) {
        throw new Error(t("profile.yemenPhoneError"));
      }

      if (isClinic) {
        await updateMyClinicProfile({
          contactPhone: normalizedPhone,
          description: description.trim() || undefined,
          facilityType: facilityType.trim() || "Healthcare facility",
          location: toLocationValue(selectedLocation),
          organizationName: displayNameDraft.trim(),
          services: splitCsv(servicesText),
        });
        return;
      }

      const years = Number(yearsExperience);
      if (!specialty.trim()) throw new Error(t("profile.specialtyRequired"));
      if (!Number.isInteger(years) || years < 0) {
        throw new Error(t("profile.yearsError"));
      }

      await updateMyProfessionalProfile({
        availability: !isClinicProfile(profile)
          ? profile.availability
          : {
              locationRadiusKm: 25,
              status: "available",
            },
        bio: description.trim() || undefined,
        fullName: displayNameDraft.trim(),
        languages: splitCsv(languagesText).length
          ? splitCsv(languagesText)
          : ["ar"],
        licenseNumber: licenseDetails.trim() || undefined,
        location: toLocationValue(selectedLocation),
        primaryPhone: normalizedPhone,
        specialty: specialty.trim(),
        yearsExperience: years,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      await refresh();
    },
  });

  const submitMutation = useMutation({
    mutationFn: (status: OnboardingStatus) => submitOnboarding(status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      await refresh();
      router.replace("/");
    },
  });

  const status = statusQuery.data;
  const uploaded = new Set(
    status?.uploadedDocuments.map((document) => document.documentType) ?? [],
  );
  const completion = status
    ? Math.round(
        (uploaded.size / Math.max(status.requiredDocuments.length, 1)) * 100,
      )
    : 0;

  return (
    <Screen
      onRefresh={() => void statusQuery.refetch()}
      refreshing={statusQuery.isFetching}
      title={t("onboarding.title")}
    >
      {statusQuery.isLoading ? <LoadingBlock /> : null}
      <ErrorBanner
        message={
          statusQuery.error instanceof Error
            ? statusQuery.error.message
            : profileQuery.error instanceof Error
              ? profileQuery.error.message
              : imageMutation.error instanceof Error
                ? imageMutation.error.message
                : saveProfileMutation.error instanceof Error
                  ? saveProfileMutation.error.message
                  : uploadMutation.error instanceof Error
                    ? uploadMutation.error.message
                    : submitMutation.error instanceof Error
                      ? submitMutation.error.message
                      : undefined
        }
      />

      {status ? (
        <>
          <Card>
            <View style={styles.progressHeader}>
              <View>
                <Text style={text.h2}>
                  {interpolate(t("onboarding.complete"), { count: completion })}
                </Text>
                <Text style={text.body}>{status.nextAction}</Text>
              </View>
              <Badge
                tone={
                  status.verificationStatus === "approved"
                    ? "success"
                    : status.verificationStatus === "rejected"
                      ? "danger"
                      : "warning"
                }
              >
                {status.verificationStatus.replace("_", " ")}
              </Badge>
            </View>
            <View
              style={[styles.track, { backgroundColor: palette.surfaceMuted }]}
            >
              <View style={[styles.fill, { width: `${completion}%` }]} />
            </View>
          </Card>

          <Card>
            <SectionHeader title={t("onboarding.profileSetup")} />
            <Text style={text.body}>{t("onboarding.profileSetupBody")}</Text>
            <View style={styles.profileHeader}>
              <Avatar label={displayNameDraft} size={72} uri={imageUrl} />
              <View style={styles.grow}>
                <Text style={text.strong}>
                  {isClinic
                    ? t("profile.uploadLogo")
                    : t("profile.uploadPhoto")}
                </Text>
                <Button
                  loading={imageMutation.isPending}
                  onPress={() => imageMutation.mutate()}
                  tone="secondary"
                >
                  {t("onboarding.chooseImage")}
                </Button>
              </View>
            </View>
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
              keyboardType="phone-pad"
              label={t("profile.yemenPhone")}
              onChangeText={setPhone}
              placeholder="77xxxxxxx"
              returnKeyType="next"
              textContentType="telephoneNumber"
              value={phone}
            />
            <LocationSelector
              onSelect={setSelectedLocation}
              selectedLocation={selectedLocation}
            />
            {isClinic ? (
              <>
                <Field
                  label={t("profile.facilityType")}
                  onChangeText={setFacilityType}
                  returnKeyType="next"
                  value={facilityType}
                />
                <Field
                  label={t("profile.services")}
                  multiline
                  onChangeText={setServicesText}
                  placeholder={t("profile.commaSeparated")}
                  returnKeyType="default"
                  value={servicesText}
                />
              </>
            ) : (
              <>
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
              loading={saveProfileMutation.isPending}
              onPress={() => saveProfileMutation.mutate()}
            >
              {t("profile.save")}
            </Button>
          </Card>

          {status.requiredDocuments.length ? (
            <SectionHeader title={t("onboarding.title")} />
          ) : null}

          {status.requiredDocuments.length ? (
            status.requiredDocuments.map((documentType) => {
              const isUploaded = uploaded.has(documentType);
              return (
                <Card key={documentType}>
                  <View style={styles.row}>
                    <View
                      style={[
                        styles.documentIcon,
                        {
                          backgroundColor: isUploaded
                            ? colors.successSoft
                            : palette.surfaceMuted,
                        },
                      ]}
                    >
                      <FileText
                        color={isUploaded ? colors.success : colors.accentDark}
                        size={20}
                      />
                    </View>
                    <View style={styles.grow}>
                      <Text style={text.strong}>{documentType}</Text>
                      <Text style={text.body}>
                        {isUploaded
                          ? t("onboarding.uploadedReview")
                          : t("onboarding.requiredBeforeSubmit")}
                      </Text>
                    </View>
                    <Badge tone={isUploaded ? "success" : "warning"}>
                      {isUploaded
                        ? t("onboarding.uploaded")
                        : t("onboarding.required")}
                    </Badge>
                  </View>
                  {!isUploaded ? (
                    <Button
                      loading={uploadMutation.isPending}
                      onPress={() => uploadMutation.mutate(documentType)}
                    >
                      {t("onboarding.uploadDocument")}
                    </Button>
                  ) : null}
                </Card>
              );
            })
          ) : (
            <EmptyState
              body={t("onboarding.noRequiredDocumentsBody")}
              title={t("onboarding.noRequiredDocumentsTitle")}
            />
          )}

          <Button
            disabled={status.missingDocuments.length > 0}
            loading={submitMutation.isPending}
            onPress={() => submitMutation.mutate(status)}
          >
            {t("onboarding.submitReview")}
          </Button>
        </>
      ) : null}
    </Screen>
  );
}

function LocationSelector({
  onSelect,
  selectedLocation,
}: {
  onSelect: (location: YemenLocation) => void;
  selectedLocation: YemenLocation;
}) {
  const t = useT();
  const text = useTextStyles();

  return (
    <View style={styles.selectorBlock}>
      <Text style={text.strong}>{t("profile.location")}</Text>
      <Text style={text.body}>{t("profile.locationHint")}</Text>
      <View style={styles.chipGrid}>
        {YEMEN_LOCATIONS.map((location) => {
          const selected =
            selectedLocation.city === location.city &&
            selectedLocation.region === location.region;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={`${location.city}-${location.region}`}
              onPress={() => onSelect(location)}
              style={[styles.chip, selected ? styles.chipSelected : undefined]}
            >
              <Text
                style={[
                  styles.chipText,
                  selected ? styles.chipTextSelected : undefined,
                ]}
              >
                {location.city}
              </Text>
            </Pressable>
          );
        })}
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

const styles = StyleSheet.create({
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
  documentIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  fill: {
    backgroundColor: colors.primary,
    height: 10,
  },
  grow: {
    flex: 1,
    gap: 4,
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  progressHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  profileHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  selectorBlock: {
    gap: 9,
  },
  track: {
    backgroundColor: colors.panelSoft,
    borderRadius: 999,
    height: 10,
    overflow: "hidden",
  },
});
