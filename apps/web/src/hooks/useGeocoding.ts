import { useState, useCallback } from "react";

interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

interface UseGeocodingReturn {
  geocode: (address: string) => Promise<GeocodeResult | null>;
  reverseGeocode: (lat: number, lng: number) => Promise<string | null>;
  isLoading: boolean;
  error: string | null;
}

// Using OpenStreetMap Nominatim (free, no API key required)
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const MAPSCO_BASE_URL = "https://geocode.maps.co";

export const useGeocoding = (): UseGeocodingReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geocode = useCallback(
    async (address: string): Promise<GeocodeResult | null> => {
      if (!address.trim()) return null;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
          {
            headers: {
              "Accept-Language": "en",
            },
          },
        );

        if (!response.ok) {
          throw new Error("Geocoding request failed");
        }

        const data = await response.json();

        if (data.length === 0) {
          setError("No results found for this address");
          return null;
        }

        const result = data[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          displayName: result.display_name,
        };
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to geocode address",
        );
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const nominatimResponse = await fetch(
          `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lng}`,
          {
            headers: {
              "Accept-Language": "en",
            },
          },
        );

        if (nominatimResponse.ok) {
          const nominatimData = await nominatimResponse.json();
          if (!nominatimData.error && nominatimData.display_name) {
            return nominatimData.display_name;
          }
        }

        const fallbackResponse = await fetch(
          `${MAPSCO_BASE_URL}/reverse?lat=${lat}&lon=${lng}`,
          {
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (!fallbackResponse.ok) {
          throw new Error("Reverse geocoding request failed");
        }

        const fallbackData = await fallbackResponse.json();
        if (fallbackData.display_name) {
          return fallbackData.display_name;
        }

        throw new Error("No reverse geocoding result found");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to reverse geocode",
        );
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { geocode, reverseGeocode, isLoading, error };
};
