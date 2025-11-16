export const normalizeWebsiteUrl = (raw: string | null | undefined): string | null => {
    if (!raw) {
        return null;
    }

    const trimmed = raw.trim();
    if (!trimmed) {
        return null;
    }

    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    return `https://${trimmed}`;
};

const BASIC_WEBSITE_PATTERN = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?$/i;

export const isLikelyValidWebsite = (raw: string): boolean => {
    if (!raw) {
        return false;
    }

    const value = raw.trim();
    if (!value || /\s/.test(value) || !value.includes('.')) {
        return false;
    }

    const toTest = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return BASIC_WEBSITE_PATTERN.test(toTest);
};
