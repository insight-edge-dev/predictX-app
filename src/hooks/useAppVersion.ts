import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import api from '@/services/api';

interface VersionInfo {
  minVersion:    string;
  latestVersion: string;
  message:       string;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function useAppVersion() {
  const [mustUpdate,     setMustUpdate]     = useState(false);
  const [shouldUpdate,   setShouldUpdate]   = useState(false);
  const [updateMessage,  setUpdateMessage]  = useState('');
  const [dismissed,      setDismissed]      = useState(false);

  useEffect(() => {
    api.get<VersionInfo>('/app-version').then((info) => {
      const current = Constants.expoConfig?.version ?? '1.0.0';
      if (compareVersions(current, info.minVersion) < 0) {
        setMustUpdate(true);
        setUpdateMessage(info.message);
      } else if (compareVersions(current, info.latestVersion) < 0) {
        setShouldUpdate(true);
        setUpdateMessage(info.message);
      }
    }).catch(() => {});
  }, []);

  return {
    mustUpdate,
    shouldUpdate: shouldUpdate && !dismissed,
    updateMessage,
    dismiss: () => setDismissed(true),
  };
}
