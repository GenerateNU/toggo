export const AvatarColorVariants = {
  rose: { background: "#FFD0D0", icon: "#7A3333" },
  peach: { background: "#FFE9D1", icon: "#7A5833" },
  mint: { background: "#E0FFD1", icon: "#4A7A33" },
  teal: { background: "#D1FFF4", icon: "#00AE83" },
  sky: { background: "#D1F0FF", icon: "#33627A" },
  lavender: { background: "#F0D1FF", icon: "#64337A" },
  blush: { background: "#FFD1F1", icon: "#7A3365" },
} as const;

export type AvatarColorKey = keyof typeof AvatarColorVariants;
export type AvatarColorVariant = (typeof AvatarColorVariants)[AvatarColorKey];
