import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { LatLng } from '../types';

export function useLocation() {
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!cancelled) setDenied(true);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!cancelled) {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      }
    })().catch(() => {
      if (!cancelled) setDenied(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { coords, denied };
}
