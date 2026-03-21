import { createTheme, MantineColorsTuple } from "@mantine/core";

// ── Neon cyan palette ────────────────────────────────────────────────────────
// [0] lightest → [9] darkest · primary shade = 4 (#00d4e8)
const neon: MantineColorsTuple = [
  "#e0fafd",
  "#b8f3f9",
  "#86e9f5",
  "#44dcef",
  "#00d4e8", // ← primaryShade: 4
  "#00bad0",
  "#009fb5",
  "#008499",
  "#006878",
  "#004d5a",
];

// ── Dark surface scale ────────────────────────────────────────────────────────
// Mantine maps these CSS vars automatically in dark mode:
//   dark[0] → --mantine-color-text  (body text)
//   dark[4] → --mantine-color-default-border
//   dark[5] → --mantine-color-default-hover
//   dark[6] → --mantine-color-default  (input / card bg)
//   dark[7] → --mantine-color-body    (page background)
const dark: MantineColorsTuple = [
  "#c8f4f9", // 0 — text
  "#a0dde8", // 1 — secondary text
  "#4a8fa0", // 2 — placeholder / muted
  "#1c4f60", // 3 — divider / subtle
  "#163e52", // 4 — default border
  "#0d2d3d", // 5 — hover / pressed bg
  "#0a1c2e", // 6 — component bg  ($bg-cell)
  "#071520", // 7 — page body      ($bg)
  "#071d30", // 8 — header / nav   ($bg-header)
  "#060f18", // 9 — darkest        ($bg-alt)
];

export const theme = createTheme({
  primaryColor: "neon",
  primaryShade: 4,
  autoContrast: true,

  fontFamily: "'Segoe UI', system-ui, sans-serif",

  colors: { neon, dark },

  defaultRadius: "sm",

  components: {
    // ── AppShell ──────────────────────────────────────────────────────────────
    AppShell: {
      styles: {
        header: {
          backgroundColor: "#071d30",
          borderBottom: "1px solid rgba(0, 212, 232, 0.2)",
          boxShadow: "0 0 16px rgba(0, 212, 232, 0.07)",
        },
      },
    },

    // ── Modal ─────────────────────────────────────────────────────────────────
    Modal: {
      styles: {
        content: {
          backgroundColor: "#071d30",
          border: "1px solid rgba(0, 212, 232, 0.3)",
          boxShadow: "0 0 24px rgba(0, 212, 232, 0.12), 0 12px 40px rgba(0, 0, 0, 0.7)",
        },
        header: {
          backgroundColor: "#071d30",
          borderBottom: "1px solid rgba(0, 212, 232, 0.18)",
        },
        title: {
          color: "#00d4e8",
          fontWeight: 600,
          letterSpacing: "0.05em",
          textShadow: "0 0 8px rgba(0, 212, 232, 0.45)",
        },
        close: {
          color: "#c8f4f9",
        },
      },
    },

    // ── Popover ───────────────────────────────────────────────────────────────
    Popover: {
      styles: {
        dropdown: {
          backgroundColor: "#071d30",
          border: "1px solid rgba(0, 212, 232, 0.3)",
          boxShadow: "0 0 16px rgba(0, 212, 232, 0.12), 0 8px 24px rgba(0, 0, 0, 0.6)",
        },
      },
    },

    // ── Input (base for TextInput, NumberInput, Select …) ─────────────────────
    // dark[6] already handles bg; we just tighten the border and add a glow on focus
    Input: {
      styles: {
        input: {
          borderColor: "rgba(0, 212, 232, 0.2)",
          "&:focus, &:focus-within": {
            borderColor: "#00d4e8",
            boxShadow: "0 0 0 2px rgba(0, 212, 232, 0.18)",
          },
        },
      },
    },

    // ── Select dropdown ───────────────────────────────────────────────────────
    Select: {
      styles: {
        dropdown: {
          backgroundColor: "#071d30",
          border: "1px solid rgba(0, 212, 232, 0.25)",
          boxShadow: "0 0 12px rgba(0, 212, 232, 0.1), 0 8px 24px rgba(0, 0, 0, 0.5)",
        },
        option: {
          "&[data-combobox-selected]": {
            backgroundColor: "rgba(0, 212, 232, 0.15)",
            color: "#00d4e8",
          },
          "&[data-combobox-hovered]": {
            backgroundColor: "rgba(0, 212, 232, 0.08)",
          },
        },
      },
    },

    // ── Switch ────────────────────────────────────────────────────────────────
    // Checked state automatically uses primary color (neon[4]).
    // Override the unchecked track border for consistency.
    Switch: {
      styles: {
        track: {
          borderColor: "rgba(0, 212, 232, 0.25)",
          cursor: "pointer",
        },
        label: {
          cursor: "pointer",
        },
      },
    },

    // ── Button ────────────────────────────────────────────────────────────────
    Button: {
      styles: {
        root: {
          transition: "all 150ms ease",
          letterSpacing: "0.03em",
        },
      },
    },

    // ── ActionIcon ────────────────────────────────────────────────────────────
    ActionIcon: {
      styles: {
        root: {
          transition: "all 150ms ease",
        },
      },
    },
  },
});
