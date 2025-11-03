/**
 * Language detection is now handled by the /api/detect-language route using OpenAI
 * This file only contains the utility function for converting ISO 639-1 language codes to names
 */

/**
 * Convert ISO 639-1 language code (2-letter) to a readable language name
 */
export function getLanguageName(code: string): string {
  const languageMap: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ru: "Russian",
    ja: "Japanese",
    ko: "Korean",
    zh: "Chinese",
    ar: "Arabic",
    hi: "Hindi",
    tr: "Turkish",
    pl: "Polish",
    nl: "Dutch",
    sv: "Swedish",
    da: "Danish",
    no: "Norwegian",
    fi: "Finnish",
    und: "Unknown",
  };

  return languageMap[code] || code.toUpperCase();
}

