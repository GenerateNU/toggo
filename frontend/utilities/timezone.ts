export const getDeviceTimeZone = (): string | null => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || null;
  } catch (err) {
    console.warn("Failed to read device timezone", err);
    return null;
  }
};
