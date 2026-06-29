export const API_GATEWAY_BASE_URL =
  process.env.EXPO_PUBLIC_API_GATEWAY_BASE_URL?.replace(/\/$/, "") ??
  "https://api.syndeocare.ai/v1";

export const YEMEN_PHONE_REGEX = /^(71|73|77|78)\d{7}$/;

export const validateYemenPhone = (value: string) =>
  YEMEN_PHONE_REGEX.test(value.replace(/\D/g, ""));

export const formatYemenPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("967") ? `+${digits}` : `+967${digits}`;
};

export type YemenLocation = {
  city: string;
  region: string;
  latitude: number;
  longitude: number;
};

export const YEMEN_LOCATIONS: YemenLocation[] = [
  {
    city: "Sanaa",
    region: "Amanat Al Asimah",
    latitude: 15.3694,
    longitude: 44.191,
  },
  { city: "Aden", region: "Aden", latitude: 12.7855, longitude: 45.0187 },
  { city: "Taiz", region: "Taiz", latitude: 13.5795, longitude: 44.0209 },
  {
    city: "Al Hudaydah",
    region: "Al Hudaydah",
    latitude: 14.7978,
    longitude: 42.9545,
  },
  { city: "Ibb", region: "Ibb", latitude: 13.9667, longitude: 44.1833 },
  {
    city: "Mukalla",
    region: "Hadhramaut",
    latitude: 14.5425,
    longitude: 49.1242,
  },
  { city: "Dhamar", region: "Dhamar", latitude: 14.5427, longitude: 44.4051 },
  { city: "Sayun", region: "Hadhramaut", latitude: 15.943, longitude: 48.7873 },
  {
    city: "Zabid",
    region: "Al Hudaydah",
    latitude: 14.1951,
    longitude: 43.3152,
  },
  { city: "Amran", region: "Amran", latitude: 15.6594, longitude: 43.9439 },
  { city: "Saada", region: "Saada", latitude: 16.9402, longitude: 43.7639 },
  {
    city: "Al Bayda",
    region: "Al Bayda",
    latitude: 13.9852,
    longitude: 45.5727,
  },
  { city: "Marib", region: "Marib", latitude: 15.4625, longitude: 45.3258 },
  { city: "Ataq", region: "Shabwah", latitude: 14.5377, longitude: 46.8319 },
  {
    city: "Al Ghaydah",
    region: "Al Mahrah",
    latitude: 16.2079,
    longitude: 52.176,
  },
];
