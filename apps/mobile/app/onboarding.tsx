import { useMutation, useQuery } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { FileText } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  createLocationSelection,
  LocationField,
  toLocationValue,
  type LocationSelection,
} from "../src/components/LocationField";
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
  formatYemenPhone,
  normalizeYemenPhoneInput,
  validateYemenPhone,
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
import {
  documentTypeMatches,
  filterDocumentTypesForRole,
  getGatewayDocumentTypeKey,
} from "../src/lib/documentTypes";
import { interpolate, useT } from "../src/lib/preferences";
import { queryClient } from "../src/lib/query";
import type {
  CatalogItem,
  ClinicProfile,
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
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationSelection>(
    createLocationSelection(),
  );
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [locationTouched, setLocationTouched] = useState(false);
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
  const documentTypesQuery = useQuery({
    queryFn: () => listCatalogItems("document_type"),
    queryKey: ["catalog", "document_type", session?.principal.role],
  });

  const profile = profileQuery.data;
  const specialtyOptions = activeCatalogItems(specialtiesQuery.data?.items);
  const certificationOptions = activeCatalogItems(
    certificationsQuery.data?.items,
  );
  const configuredDocumentTypes = filterDocumentTypesForRole(
    documentTypesQuery.data?.items,
    isClinic ? "clinic" : "professional",
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
      setPhone(normalizeYemenPhoneInput(profile.contactPhone ?? ""));
      setDescription(profile.description ?? "");
      setFacilityType(cleanFacilityType(profile.facilityType));
      setWebsiteUrl(profile.websiteUrl ?? "");
      return;
    }

    setDisplayNameDraft(profile.fullName);
    setPhone(normalizeYemenPhoneInput(profile.primaryPhone ?? ""));
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
      const normalizedPhone = formatYemenPhone(phone);

      if (!displayNameDraft.trim()) throw new Error(t("validation.name"));
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
        await updateMyClinicProfile({
          contactPhone: normalizedPhone,
          description: description.trim() || undefined,
          facilityType:
            cleanFacilityType(facilityType) || "Healthcare facility",
          location: toLocationValue(selectedLocation),
          organizationName: displayNameDraft.trim(),
          services: isClinicProfile(profile) ? profile.services : [],
          websiteUrl: websiteUrl.trim() || undefined,
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
  const documentSlots =
    status && configuredDocumentTypes.length
      ? configuredDocumentTypes.map((docType) => ({
          key: getGatewayDocumentTypeKey(docType),
          label: docType.nameAr || docType.name,
          required: docType.isRequired,
          uploaded: status.uploadedDocuments.some((document) =>
            documentTypeMatches(document.documentType, docType),
          ),
        }))
      : (status?.requiredDocuments ?? []).map((documentType) => ({
          key: documentType,
          label: documentType,
          required: true,
          uploaded: uploaded.has(documentType),
        }));
  const requiredDocumentSlots = documentSlots.filter((slot) => slot.required);
  const missingRequiredDocumentKeys = requiredDocumentSlots
    .filter((slot) => !slot.uploaded)
    .map((slot) => slot.key);
  const completion = status
    ? Math.round(
        ((requiredDocumentSlots.length - missingRequiredDocumentKeys.length) /
          Math.max(requiredDocumentSlots.length, 1)) *
          100,
      )
    : 0;
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
                      : documentTypesQuery.error instanceof Error
                        ? documentTypesQuery.error.message
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

          {documentSlots.length ? (
            <SectionHeader title={t("onboarding.title")} />
          ) : null}

          {documentSlots.length ? (
            documentSlots.map((documentSlot) => {
              return (
                <Card key={documentSlot.key}>
                  <View style={styles.row}>
                    <View
                      style={[
                        styles.documentIcon,
                        {
                          backgroundColor: documentSlot.uploaded
                            ? colors.successSoft
                            : palette.surfaceMuted,
                        },
                      ]}
                    >
                      <FileText
                        color={
                          documentSlot.uploaded
                            ? colors.success
                            : colors.accentDark
                        }
                        size={20}
                      />
                    </View>
                    <View style={styles.grow}>
                      <Text style={text.strong}>{documentSlot.label}</Text>
                      <Text style={text.body}>
                        {documentSlot.uploaded
                          ? t("onboarding.uploadedReview")
                          : t("onboarding.requiredBeforeSubmit")}
                      </Text>
                    </View>
                    <Badge tone={documentSlot.uploaded ? "success" : "warning"}>
                      {documentSlot.uploaded
                        ? t("onboarding.uploaded")
                        : documentSlot.required
                          ? t("onboarding.required")
                          : t("common.optional")}
                    </Badge>
                  </View>
                  {!documentSlot.uploaded ? (
                    <Button
                      loading={uploadMutation.isPending}
                      onPress={() => uploadMutation.mutate(documentSlot.key)}
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
            disabled={missingRequiredDocumentKeys.length > 0}
            loading={submitMutation.isPending}
            onPress={() =>
              submitMutation.mutate({
                ...status,
                missingDocuments: missingRequiredDocumentKeys,
                requiredDocuments: requiredDocumentSlots.map(
                  (slot) => slot.key,
                ),
              })
            }
          >
            {t("onboarding.submitReview")}
          </Button>
        </>
      ) : null}
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
  track: {
    backgroundColor: colors.panelSoft,
    borderRadius: 999,
    height: 10,
    overflow: "hidden",
  },
});
