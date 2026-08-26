import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-book-club-lottery",
  displayName: "Book Club Draw",
  visualProfile: "gather",
  shellLayout: "inset",
  description:
    "A shared reading-room draw where every member submits one book and everyone sees the same transparent result.",
  accentHex: "#d9b66b",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
