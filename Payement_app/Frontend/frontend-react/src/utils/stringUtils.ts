// Function to extract the name part from a given email address
export const extractNameFromEmail = (email: string): string => {
  return email.split("@")[0];
};

// Function to set the userRole in localStorage
export const setUserRole = (userRole: string) => {
  return localStorage.setItem("userRole", userRole);
};

// Function to get the userRole from localStorage
export const getUserRole = () => {
  return localStorage.getItem("userRole");
};

// Function to remove the userRole from localStorage
export const removeUserRole = () => {
  localStorage.removeItem("userRole");
};
//Function ton trim value
export function trimValue(value: string): string {
  return value.trim();
}

//Function ton trim Object value
export function trimObjectValues<T extends Record<string, any>>(obj: T): T {
  const trimmed: Record<string, any> = {};

  for (const key in obj) {
    const value = obj[key];
    trimmed[key] = typeof value === "string" ? value.trim() : value;
  }

  return trimmed as T;
}
// Function to set the curentUser in localStorage
export const setCurentUser = (userRole: string) => {
  return localStorage.setItem("curentUser", userRole);
};

// Function to get the curentUser from localStorage
export const getCurentUser = () => {
  return localStorage.getItem("curentUser");
};

// Function to remove the curentUser from localStorage
export const removeCurentUser = () => {
  localStorage.removeItem("curentUser");
};




