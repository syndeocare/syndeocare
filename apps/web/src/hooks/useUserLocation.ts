import { useState, useCallback } from "react";

interface UserLocation {
  lat: number;
  lng: number;
}

interface UseUserLocationReturn {
  location: UserLocation | null;
  isLoading: boolean;
  error: string | null;
  getCurrentLocation: () => Promise<UserLocation | null>;
}

export const useUserLocation = (): UseUserLocationReturn => {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation =
    useCallback(async (): Promise<UserLocation | null> => {
      if (!navigator.geolocation) {
        setError("Geolocation is not supported by your browser");
        return null;
      }

      if (!window.isSecureContext) {
        setError("Location requires a secure connection (HTTPS)");
        return null;
      }

      setIsLoading(true);
      setError(null);

      const getPosition = (
        options: PositionOptions,
      ): Promise<GeolocationPosition> =>
        new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });

      const getApproximateLocationFromIP =
        async (): Promise<UserLocation | null> => {
          try {
            const response = await fetch("https://ipapi.co/json/");
            if (!response.ok) return null;

            const data = await response.json();
            const lat = Number(data?.latitude);
            const lng = Number(data?.longitude);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
              return null;
            }

            return { lat, lng };
          } catch {
            return null;
          }
        };

      try {
        const highAccuracyPosition = await getPosition({
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        });

        const userLocation = {
          lat: highAccuracyPosition.coords.latitude,
          lng: highAccuracyPosition.coords.longitude,
        };
        setLocation(userLocation);
        return userLocation;
      } catch (firstErr) {
        try {
          const fallbackPosition = await getPosition({
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 600000,
          });

          const userLocation = {
            lat: fallbackPosition.coords.latitude,
            lng: fallbackPosition.coords.longitude,
          };
          setLocation(userLocation);
          return userLocation;
        } catch (secondErr) {
          const ipLocation = await getApproximateLocationFromIP();
          if (ipLocation) {
            setLocation(ipLocation);
            setError(null);
            return ipLocation;
          }

          const err = secondErr as GeolocationPositionError;
          let errorMessage = "Failed to get location";
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = "Location permission denied";
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = "Location information unavailable";
              break;
            case err.TIMEOUT:
              errorMessage = "Location request timed out";
              break;
          }
          setError(errorMessage);
          return null;
        }
      } finally {
        setIsLoading(false);
      }
    }, []);

  return { location, isLoading, error, getCurrentLocation };
};
