export const isStringEmpty = (str: string | undefined | null): boolean => {
  if (typeof str !== 'string') {
    return true;
  }

  return str.trim().length === 0;
};
