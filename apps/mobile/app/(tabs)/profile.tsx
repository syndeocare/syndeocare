import { useMutation, useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  Avatar,
  Badge,
  Button,
  Card,
  ErrorBanner,
  Field,
  LoadingBlock,
  Screen,
  SectionHeader,
  colors,
  useTextStyles,
} from "../../src/components/ui";
import { formatYemenPhone, validateYemenPhone } from "../../src/config";
import {
  getMyClinicProfile,
  getMyProfessionalProfile,
  requestEmailVerification,
  updateMyClinicProfile,
  updatePassword,
  updateMyProfessionalProfile,
  uploadProfileImage,
} from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { useT } from "../../src/lib/preferences";
import { queryClient } from "../../src/lib/query";
import type { ClinicProfile, ProfessionalProfile } from "../../src/types";

type MobileProfile = ClinicProfile | ProfessionalProfile;

function isClinicProfile(profile: MobileProfile): profile is ClinicProfile {
  return "organizationName" in profile;
}

export default function ProfileScreen() {
  const { logout, session } = useAuth();
  const t = useT();
  const text = useTextStyles();
  const isClinic = session?.principal.role === "clinic";
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const profileQuery = useQuery<MobileProfile>({
    queryFn: () => (isClinic ? getMyClinicProfile() : getMyProfessionalProfile()),
    queryKey: ["profile", session?.principal.role],
  });

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

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      const normalizedPhone = phone ? formatYemenPhone(phone) : undefined;

      if (phone && !validateYemenPhone(phone)) {
        throw new Error(t("profile.yemenPhoneError"));
      }

      if (isClinic) {
        await updateMyClinicProfile({
          ...profile,
          contactPhone: normalizedPhone,
          description: description || (isClinicProfile(profile) ? profile.description : ""),
        });
      } else {
        await updateMyProfessionalProfile({
          ...profile,
          bio: description || (!isClinicProfile(profile) ? profile.bio : ""),
          primaryPhone: normalizedPhone,
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
  const imageMutation = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
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
    },
  });

  return (
    <Screen
      onRefresh={() => void profileQuery.refetch()}
      refreshing={profileQuery.isFetching}
      title={t("profile.title")}
    >
      {profileQuery.isLoading ? <LoadingBlock label={t("profile.loading")} /> : null}
      <ErrorBanner
        message={
          profileQuery.error instanceof Error
            ? profileQuery.error.message
            : saveMutation.error instanceof Error
              ? saveMutation.error.message
              : imageMutation.error instanceof Error
              ? imageMutation.error.message
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
        <SectionHeader title={t("profile.quickUpdate")} />
        <Text style={text.body}>{t("profile.yemenFixed")}</Text>
        <Field
          label={t("profile.yemenPhone")}
          onChangeText={setPhone}
          placeholder="77xxxxxxx"
          value={phone}
        />
        <Field
          label={
            isClinic ? t("profile.facilityDescription") : t("profile.bio")
          }
          multiline
          onChangeText={setDescription}
          value={description}
        />
        <Button loading={saveMutation.isPending} onPress={() => saveMutation.mutate()}>
          {t("profile.save")}
        </Button>
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
        <Field
          label={t("profile.currentPassword")}
          onChangeText={setCurrentPassword}
          secureTextEntry
          value={currentPassword}
        />
        <Field
          label={t("profile.newPassword")}
          onChangeText={setNewPassword}
          secureTextEntry
          value={newPassword}
        />
        <Button
          disabled={currentPassword.length < 8 || newPassword.length < 8}
          loading={passwordMutation.isPending}
          onPress={() => passwordMutation.mutate()}
          tone="secondary"
        >
          {t("profile.changePassword")}
        </Button>
        {passwordMutation.isSuccess ? (
          <Text style={styles.success}>{t("profile.passwordChanged")}</Text>
        ) : null}
      </Card>

      <Button onPress={logout} tone="danger">
        {t("profile.logout")}
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
