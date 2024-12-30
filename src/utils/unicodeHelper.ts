export const numberToUnicode = (number: number): string => {
  const unicodeDigits = ["𝟬", "𝟭", "𝟮", "𝟯", "𝟰", "𝟱", "𝟲", "𝟳", "𝟴", "𝟵"];

  let unicodeString = "";
  const numString = number.toString();

  // Iterate over each digit of the number and convert to the Unicode character
  for (let i = 0; i < numString.length; i++) {
    const digit = parseInt(numString[i], 10);
    unicodeString += unicodeDigits[digit];
  }

  return unicodeString;
};
