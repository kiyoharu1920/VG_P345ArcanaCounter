import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARCANA COUNTER | ペルソナ × ヴァンガード",
  description: "P3・P4・P5のアルカナマーカーを0〜3で管理できる、非公式の対戦用カウンター。",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#10151f" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="ja"><body>{children}</body></html>;
}
