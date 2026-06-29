import * as Location from "expo-location";
import { Loader2, MapPin, Navigation, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, useTextStyles, useThemePalette } from "./ui";
import { useT } from "../lib/preferences";
import type { LocationValue } from "../types";

export type LocationSelection = {
  address: string;
  city: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
};

type SearchResult = {
  address?: {
    city?: string;
    country?: string;
    municipality?: string;
    state?: string;
    town?: string;
    village?: string;
  };
  display_name: string;
  lat: string;
  lon: string;
};

const FALLBACK_LOCATION_SUGGESTIONS: SearchResult[] = [
  { display_name: "Sana'a, Yemen", lat: "15.3694", lon: "44.1910" },
  { display_name: "Aden, Yemen", lat: "12.7855", lon: "45.0187" },
  { display_name: "Taiz, Yemen", lat: "13.5795", lon: "44.0209" },
  { display_name: "Al Hudaydah, Yemen", lat: "14.7978", lon: "42.9545" },
  { display_name: "Ibb, Yemen", lat: "13.9667", lon: "44.1833" },
  { display_name: "Mukalla, Yemen", lat: "14.5412", lon: "49.1242" },
  { display_name: "Dhamar, Yemen", lat: "14.5578", lon: "44.3876" },
  { display_name: "Seiyun, Yemen", lat: "15.9481", lon: "48.7864" },
  { display_name: "Saada, Yemen", lat: "16.9402", lon: "43.7639" },
  { display_name: "Marib, Yemen", lat: "15.4701", lon: "45.3258" },
];

const cleanCityLabel = (value: string) =>
  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)[0] ?? value.trim();

const normalizeStoredAddress = (result: SearchResult) => {
  const city =
    result.address?.city ??
    result.address?.town ??
    result.address?.village ??
    result.address?.municipality ??
    cleanCityLabel(result.display_name);
  const region = result.address?.state ?? "Yemen";
  return { address: [city, region].filter(Boolean).join(", "), city, region };
};

const dedupeSuggestions = (items: SearchResult[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.display_name.toLowerCase()}|${item.lat}|${item.lon}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const searchWithOpenMeteo = async (query: string): Promise<SearchResult[]> => {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`,
  );

  if (!response.ok) return [];

  const data = await response.json();
  if (!Array.isArray(data?.results)) return [];

  return data.results
    .filter((item: { country_code?: string }) => item.country_code === "YE")
    .map((item: any) => ({
      address: {
        city: item.name,
        country: item.country,
        state: item.admin1,
      },
      display_name: [item.name, item.admin1, item.country]
        .filter(Boolean)
        .join(", "),
      lat: String(item.latitude),
      lon: String(item.longitude),
    }));
};

export function createLocationSelection(
  location?:
    | (Partial<Omit<LocationValue, "latitude" | "longitude">> & {
        latitude?: number | null;
        longitude?: number | null;
      })
    | null,
): LocationSelection {
  const fallback = FALLBACK_LOCATION_SUGGESTIONS[0]!;
  const city = location?.city?.trim() || cleanCityLabel(fallback.display_name);
  const region = location?.region?.trim() || "Yemen";
  return {
    address: [city, region].filter(Boolean).join(", "),
    city,
    latitude:
      typeof location?.latitude === "number"
        ? location.latitude
        : Number(fallback.lat),
    longitude:
      typeof location?.longitude === "number"
        ? location.longitude
        : Number(fallback.lon),
    region,
  };
}

export function toLocationValue(selection: LocationSelection): LocationValue {
  if (selection.latitude == null || selection.longitude == null) {
    throw new Error(
      "Select a location from suggestions or use current location.",
    );
  }

  return {
    city: selection.city.trim() || cleanCityLabel(selection.address),
    latitude: selection.latitude,
    longitude: selection.longitude,
    region: selection.region.trim() || "Yemen",
  };
}

export function LocationField({
  error,
  onChange,
  value,
}: {
  error?: string;
  onChange: (location: LocationSelection) => void;
  value: LocationSelection;
}) {
  const t = useT();
  const text = useTextStyles();
  const palette = useThemePalette();
  const [inputValue, setInputValue] = useState(cleanCityLabel(value.address));
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasNetworkResults, setHasNetworkResults] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const fallbackSuggestions = useMemo(
    () => FALLBACK_LOCATION_SUGGESTIONS.slice(0, 8),
    [],
  );

  useEffect(() => {
    setInputValue(cleanCityLabel(value.address));
  }, [value.address]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const query = inputValue.trim();

    if (query.length < 2) {
      setSuggestions([]);
      setHasNetworkResults(false);
      return () => controller.abort();
    }

    const timeout = setTimeout(() => {
      void (async () => {
        setIsSearching(true);
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1&countrycodes=ye`,
            {
              headers: { "Accept-Language": "en,ar" },
              signal: controller.signal,
            },
          );

          if (!response.ok) throw new Error("Location search failed");

          const data = await response.json();
          if (!mounted) return;

          const nominatimResults: SearchResult[] = Array.isArray(data)
            ? data
            : [];
          if (nominatimResults.length > 0) {
            setSuggestions(dedupeSuggestions(nominatimResults));
            setHasNetworkResults(true);
          } else {
            const openMeteoResults = await searchWithOpenMeteo(query);
            setSuggestions(
              openMeteoResults.length
                ? dedupeSuggestions(openMeteoResults)
                : fallbackSuggestions.filter((item) =>
                    item.display_name
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  ),
            );
            setHasNetworkResults(openMeteoResults.length > 0);
          }
          setShowSuggestions(true);
        } catch {
          if (!mounted) return;
          const openMeteoResults = await searchWithOpenMeteo(query).catch(
            () => [],
          );
          setSuggestions(
            openMeteoResults.length
              ? dedupeSuggestions(openMeteoResults)
              : fallbackSuggestions.filter((item) =>
                  item.display_name.toLowerCase().includes(query.toLowerCase()),
                ),
          );
          setHasNetworkResults(openMeteoResults.length > 0);
          setShowSuggestions(true);
        } finally {
          if (mounted) setIsSearching(false);
        }
      })();
    }, 450);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [fallbackSuggestions, inputValue]);

  const selectSuggestion = (suggestion: SearchResult) => {
    const normalized = normalizeStoredAddress(suggestion);
    const next = {
      ...normalized,
      latitude: Number(suggestion.lat),
      longitude: Number(suggestion.lon),
    };
    setInputValue(cleanCityLabel(next.address));
    setLocalError(null);
    onChange(next);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const useCurrentLocation = async () => {
    setLocalError(null);
    setIsDetecting(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        throw new Error(t("location.currentLocationFailed"));
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const reversed = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      }).catch(() => []);
      const first = reversed[0];
      const city =
        first?.city ||
        first?.district ||
        first?.subregion ||
        "Current location";
      const region = first?.region || "Yemen";
      const address = [city, region].filter(Boolean).join(", ");
      setInputValue(cleanCityLabel(address));
      onChange({ address, city, latitude, longitude, region });
      setShowSuggestions(false);
      setSuggestions([]);
    } catch (currentLocationError) {
      setLocalError(
        currentLocationError instanceof Error
          ? currentLocationError.message
          : t("location.currentLocationFailed"),
      );
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <View style={styles.field}>
      <Text style={text.strong}>{t("profile.location")}</Text>
      <Text style={text.body}>{t("profile.locationHint")}</Text>
      <View style={styles.locationRow}>
        <View
          style={[
            styles.inputShell,
            {
              backgroundColor: palette.input,
              borderColor: error ? colors.danger : palette.border,
            },
          ]}
        >
          <MapPin color={palette.placeholder} size={18} />
          <TextInput
            accessibilityLabel={t("profile.location")}
            autoCapitalize="words"
            onChangeText={(next) => {
              setInputValue(next);
              setLocalError(null);
              onChange({
                address: next,
                city: cleanCityLabel(next),
                latitude: null,
                longitude: null,
                region: "Yemen",
              });
            }}
            onFocus={() => {
              setSuggestions(fallbackSuggestions);
              setHasNetworkResults(false);
              setShowSuggestions(true);
            }}
            placeholder={t("location.searchPlaceholder")}
            placeholderTextColor={palette.placeholder}
            style={[styles.input, { color: palette.text }]}
            value={inputValue}
          />
          {inputValue ? (
            <Pressable
              accessibilityLabel={t("common.clear")}
              accessibilityRole="button"
              onPress={() => {
                setInputValue("");
                onChange({
                  address: "",
                  city: "",
                  latitude: null,
                  longitude: null,
                  region: "Yemen",
                });
                setSuggestions([]);
                setShowSuggestions(false);
              }}
            >
              <X color={palette.placeholder} size={18} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityLabel={t("location.useCurrentLocation")}
          accessibilityRole="button"
          disabled={isDetecting}
          onPress={useCurrentLocation}
          style={[
            styles.locationButton,
            {
              backgroundColor: palette.surfaceMuted,
              borderColor: palette.border,
            },
          ]}
        >
          {isDetecting ? (
            <Loader2 color={colors.primary} size={19} />
          ) : (
            <Navigation color={colors.primary} size={19} />
          )}
        </Pressable>
      </View>
      {showSuggestions && suggestions.length ? (
        <View
          style={[
            styles.suggestions,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          {!hasNetworkResults ? (
            <Text style={text.body}>{t("location.popularSuggestions")}</Text>
          ) : null}
          {suggestions.map((suggestion) => (
            <Pressable
              accessibilityRole="button"
              key={`${suggestion.display_name}-${suggestion.lat}-${suggestion.lon}`}
              onPress={() => selectSuggestion(suggestion)}
              style={styles.suggestionItem}
            >
              <MapPin color={palette.placeholder} size={16} />
              <Text style={[styles.suggestionText, { color: palette.text }]}>
                {suggestion.display_name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {isSearching ? (
        <Text style={text.body}>{t("common.loading")}</Text>
      ) : null}
      {value.latitude != null && value.longitude != null ? (
        <Text style={text.body}>
          {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
        </Text>
      ) : (
        <Text style={[styles.warning, { color: colors.warning }]}>
          {t("location.mustSelect")}
        </Text>
      )}
      {error || localError ? (
        <Text style={styles.error}>{error || localError}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  field: {
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    minHeight: 52,
  },
  inputShell: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 54,
    paddingHorizontal: 14,
  },
  locationButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  suggestionItem: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 10,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  suggestions: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  warning: {
    fontSize: 13,
    lineHeight: 18,
  },
});
