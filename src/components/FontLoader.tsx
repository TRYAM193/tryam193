import { useEffect, useState, ReactNode } from "react";
import { FONTS } from "@/data/font";
import EditorSkeleton from "./EditorSkeleton";

export default function FontLoader({ children }: { children: ReactNode }) {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const families = Object.entries(FONTS).map(([family, config]) => {
      let styles = ["0,400"];

      if (config.bold) styles.push("0,700");
      if (config.italic) styles.push("1,400");
      if (config.bold && config.italic) styles.push("1,700");

      const styleString = styles.sort().join(";");
      return `${family.replace(/ /g, "+")}:ital,wght@${styleString}`;
    });

    const query = families.join("&family=");
    const href = `https://fonts.googleapis.com/css2?family=${query}&display=swap`;

    const linkId = "dynamic-google-fonts";

    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }

    // 🔑 WAIT until fonts are actually available
    const loadFonts = async () => {
      const fontPromises = Object.keys(FONTS).map((family) =>
        document.fonts.load(`400 1em "${family}"`)
      );

      await Promise.all(fontPromises);
      setFontsLoaded(true);
    };

    loadFonts();
  }, []);

  if (!fontsLoaded) {
  return <EditorSkeleton />;
}

  return children;
}
