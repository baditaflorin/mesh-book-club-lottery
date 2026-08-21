import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-book-club-lottery",
  description:
    "A browser-local book-club lottery with one nomination per peer and a transparent draw.",
  accentHex: "#d98d45",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
