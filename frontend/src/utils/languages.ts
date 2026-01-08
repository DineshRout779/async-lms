export type Language = {
  label: string;
  value: string;
  monaco: string;
};

export const languages: Language[] = [
  { label: "JavaScript", value: "javascript", monaco: "javascript" },
  { label: "Python", value: "python", monaco: "python" },
];