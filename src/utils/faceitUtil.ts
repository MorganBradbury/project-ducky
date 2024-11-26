// src/utils/validationUtils.ts
export function validateAndExtract<T>(
  data: any,
  requiredFields: (keyof T)[]
): T | null {
  if (!data) return null;

  const missingFields = requiredFields.filter(
    (field) => data[field] === undefined
  );

  if (missingFields.length > 0) {
    console.warn(`Missing fields: ${missingFields.join(", ")}`);
    return null;
  }

  return data as T;
}
