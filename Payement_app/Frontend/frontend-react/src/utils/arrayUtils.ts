// Function to filter out elements from an array where a specific key has an empty or undefined value
export const filterNonEmptyValues = <T>(arr: T[], key: keyof T): T[] => {
  const seen = new Set();

  return arr.filter((item) => {
    const value = item[key];

    if (!value || value.toString().trim() === "") return false;

    const trimmed = value.toString().trim();
    if (seen.has(trimmed)) return false;

    seen.add(trimmed);
    return true;
  });
};
