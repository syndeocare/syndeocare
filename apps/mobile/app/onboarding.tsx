import { useMutation, useQuery } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { FileText } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  Screen,
  SectionHeader,
  colors,
  useTextStyles,
  useThemePalette,
} from "../src/components/ui";
import {
  authenticatedRequest,
  getOnboardingStatus,
  submitOnboarding,
} from "../src/lib/api";
import { useAuth } from "../src/lib/auth";
import { interpolate, useT } from "../src/lib/preferences";
import { queryClient } from "../src/lib/query";
import type { OnboardingStatus } from "../src/types";

type UploadDescriptor = {
  bucket: string;
  key: string;
  uploadHeaders: { "content-type": string };
  uploadMethod: "PUT";
  uploadUrl: string;
};

async function uploadDocument(documentType: string, uploadFailedMessage: string) {
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
  const { refresh } = useAuth();
  const t = useT();
  const text = useTextStyles();
  const palette = useThemePalette();
  const statusQuery = useQuery({
    queryFn: getOnboardingStatus,
    queryKey: ["onboarding"],
  });

  const uploadMutation = useMutation({
    mutationFn: (documentType: string) =>
      uploadDocument(documentType, t("onboarding.uploadFailed")),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["onboarding"] });
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
            <View style={[styles.track, { backgroundColor: palette.surfaceMuted }]}>
              <View style={[styles.fill, { width: `${completion}%` }]} />
            </View>
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

const styles = StyleSheet.create({
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
  track: {
    backgroundColor: colors.panelSoft,
    borderRadius: 999,
    height: 10,
    overflow: "hidden",
  },
});
